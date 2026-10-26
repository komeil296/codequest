import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Req,
  UnauthorizedException,
  TooManyRequestsException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const loginFailures = new Map<string, { count: number; windowStartedAt: number }>();

function assertLoginAllowed(request: Request): string {
  const key = request.ip || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = loginFailures.get(key);

  if (!current || now - current.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 0, windowStartedAt: now });
  } else if (current.count >= LOGIN_MAX_FAILURES) {
    throw new TooManyRequestsException('Too many login attempts. Please try again in 15 minutes.');
  }

  if (loginFailures.size > 5000) {
    for (const [entryKey, entry] of loginFailures) {
      if (now - entry.windowStartedAt >= LOGIN_WINDOW_MS) loginFailures.delete(entryKey);
    }
  }

  return key;
}

function recordLoginFailure(key: string): void {
  const entry = loginFailures.get(key);
  if (entry) entry.count += 1;
}

function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const item = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  if (!item) return undefined;
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

function readCsrfHeader(request: Request): string | undefined {
  const value = request.headers['x-csrf-token'];
  return Array.isArray(value) ? value[0] : value;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookies(response: Response, result: {
    refreshToken: string;
    csrfToken: string;
    expiresAt: Date;
  }) {
    const expires = new Date(result.expiresAt);
    response.cookie('codequest_refresh', result.refreshToken, {
      ...COOKIE_OPTIONS,
      expires,
      httpOnly: true,
    });
    response.cookie('codequest_csrf', result.csrfToken, {
      ...COOKIE_OPTIONS,
      expires,
      httpOnly: false,
    });
  }

  private clearSessionCookies(response: Response) {
    response.clearCookie('codequest_refresh', COOKIE_OPTIONS);
    response.clearCookie('codequest_csrf', { ...COOKIE_OPTIONS, httpOnly: false });
  }

  private publicSessionResult(result: {
    accessToken: string;
    user: unknown;
    refreshToken: string;
    csrfToken: string;
    expiresAt: Date;
  }) {
    const { refreshToken, csrfToken, expiresAt, ...publicResult } = result;
    return publicResult;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with username and password' })
  @ApiOkResponse({ description: 'Login successful; returns an access token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rateLimitKey = assertLoginAllowed(request);

    try {
      const result = await this.authService.login(dto.username, dto.password);
      clearLoginFailures(rateLimitKey);
      this.setSessionCookies(response, result);
      return this.publicSessionResult(result);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        recordLoginFailure(rateLimitKey);
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ description: 'Session refreshed.' })
  @ApiUnauthorizedResponse({ description: 'Missing, expired, or invalid session/CSRF token.' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request, 'codequest_refresh');
    const csrfCookie = readCookie(request, 'codequest_csrf');
    const csrfHeader = readCsrfHeader(request);
    if (!refreshToken || !csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new UnauthorizedException('CSRF validation failed');
    }

    const result = await this.authService.refreshSession(refreshToken, csrfCookie);
    this.setSessionCookies(response, result);
    return this.publicSessionResult(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh session and clear cookies' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request, 'codequest_refresh');
    const csrfCookie = readCookie(request, 'codequest_csrf');
    const csrfHeader = readCsrfHeader(request);
    if (refreshToken && (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader)) {
      throw new UnauthorizedException('CSRF validation failed');
    }
    if (refreshToken && csrfCookie) {
      await this.authService.revokeSession(refreshToken, csrfCookie);
    }
    this.clearSessionCookies(response);
  }
}
