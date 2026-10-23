
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './user.entity';
import { Institution } from '../institutions/institution.entity';
import { CreateInstitutionAdminDto } from './dto/create-institution-admin.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  async createInstitutionAdmin(dto: CreateInstitutionAdminDto) {
    const username = dto.username.trim();
    const mobile = dto.mobile.trim();

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { mobile }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('Username already exists');
      }

      throw new ConflictException('Mobile number already exists');
    }

    const institution = await this.institutionRepository.findOne({
      where: {
        id: dto.institutionId,
        isActive: true,
      },
    });

    if (!institution) {
      throw new NotFoundException('Active institution not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      mobile,
      username,
      passwordHash,
      role: UserRole.INSTITUTION_ADMIN,
      institution,
      mobileVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      mobile: savedUser.mobile,
      username: savedUser.username,
      role: savedUser.role,
      institutionId: institution.id,
      mobileVerified: savedUser.mobileVerified,
      createdAt: savedUser.createdAt,
    };
  }
}
