import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { AuthSession } from './auth-session.entity';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
    private readonly jwtService: JwtService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private tokensMatch(token: string, storedHash: string): boolean {
    const tokenHash = Buffer.from(this.hashToken(token), 'hex');
    const expectedHash = Buffer.from(storedHash, 'hex');
    return tokenHash.length === expectedHash.length && timingSafeEqual(tokenHash, expectedHash);
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      institutionId: user.institution?.id ?? null,
    };
  }

  private async createSessionForUser(userId: string) {
    const refreshToken = this.createOpaqueToken();
    const csrfToken = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const session = this.sessionRepository.create({
      userId,
      refreshTokenHash: this.hashToken(refreshToken),
      csrfTokenHash: this.hashToken(csrfToken),
      expiresAt,
      revokedAt: null,
    });
    await this.sessionRepository.save(session);
    return { refreshToken, csrfToken, expiresAt };
  }

  private async createAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      institutionId: user.institution?.id ?? null,
    });
  }

  async login(username: string, password: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.institution', 'institution')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username: username.trim() })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      (!user.institution || !user.institution.isActive)
    ) {
      throw new UnauthorizedException('Institution is inactive');
    }

    const sessionTokens = await this.createSessionForUser(user.id);
    return {
      accessToken: await this.createAccessToken(user),
      user: this.publicUser(user),
      ...sessionTokens,
    };
  }

  async refreshSession(refreshToken: string, csrfToken: string) {
    if (!refreshToken || !csrfToken) throw new UnauthorizedException('Session is invalid');

    const oldRefreshHash = this.hashToken(refreshToken);
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: oldRefreshHash },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !this.tokensMatch(csrfToken, session.csrfTokenHash)
    ) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: session.userId },
      relations: { institution: true },
    });

    if (
      !user ||
      !user.isActive ||
      (user.role !== UserRole.SUPER_ADMIN &&
        (!user.institution || !user.institution.isActive))
    ) {
      await this.sessionRepository.update(
        { id: session.id, revokedAt: null },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Account is inactive');
    }

    const nextRefreshToken = this.createOpaqueToken();
    const nextCsrfToken = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const rotation = await this.sessionRepository.update(
      {
        id: session.id,
        refreshTokenHash: oldRefreshHash,
        revokedAt: null,
      },
      {
        refreshTokenHash: this.hashToken(nextRefreshToken),
        csrfTokenHash: this.hashToken(nextCsrfToken),
        expiresAt,
      },
    );

    if (!rotation.affected) throw new UnauthorizedException('Session has already been used');

    return {
      accessToken: await this.createAccessToken(user),
      user: this.publicUser(user),
      refreshToken: nextRefreshToken,
      csrfToken: nextCsrfToken,
      expiresAt,
    };
  }

  async revokeSession(refreshToken: string, csrfToken: string) {
    if (!refreshToken || !csrfToken) return;
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: this.hashToken(refreshToken) },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !this.tokensMatch(csrfToken, session.csrfTokenHash)
    ) {
      throw new UnauthorizedException('Session is invalid');
    }
    await this.sessionRepository.update(
      { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}
