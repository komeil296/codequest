import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

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

    if (user.mobile && !user.mobileVerified) {
      throw new UnauthorizedException('Mobile number is not verified');
    }

    if (
      user.role !== 'SUPER_ADMIN' &&
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

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        institutionId,
      },
    };
  }
}
