import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
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

  async createSessionForUser(userId: string) {
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

    // Mobile verification is not enforced until a complete verification flow
    // (such as an OTP challenge) is implemented. Institution-created student
    // accounts can therefore sign in with their assigned username/password.

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      (!user.institution || !user.institution.isActive)
    ) {
      throw new UnauthorizedException('Institution is inactive');
    }

    const institutionId = user.institution?.id ?? null;
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      institutionId,
    };

    const sessionTokens = await this.createSessionForUser(user.id);
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.publicUser(user),
      ...sessionTokens,
    };
  }
}
