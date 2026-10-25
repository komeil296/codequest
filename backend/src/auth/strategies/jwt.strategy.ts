import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../../users/user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  institutionId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not configured');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { institution: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    if (user.mobile && !user.mobileVerified) {
      throw new UnauthorizedException('Mobile number is not verified');
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      (!user.institution || !user.institution.isActive)
    ) {
      throw new UnauthorizedException('Institution is inactive');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      // Always trust the current database relation, never the token's institutionId.
      institutionId: user.institution?.id ?? null,
    };
  }
}
