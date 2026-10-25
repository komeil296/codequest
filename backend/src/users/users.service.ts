import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User, UserRole } from './user.entity';
import { Institution } from '../institutions/institution.entity';
import { CreateInstitutionAdminDto } from './dto/create-institution-admin.dto';
import { CreateStudentDto } from './dto/create-student.dto';

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
      where: { id: dto.institutionId, isActive: true },
    });

    if (!institution) {
      throw new NotFoundException('Active institution not found');
    }

    const user = this.userRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      mobile,
      username,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: UserRole.INSTITUTION_ADMIN,
      institution,
      mobileVerified: false,
      isActive: true,
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
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt,
    };
  }

  async createStudent(
    institutionId: string,
    dto: CreateStudentDto,
  ) {
    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId, isActive: true },
    });

    if (!institution) {
      throw new NotFoundException('Active institution not found');
    }

    const mobile = dto.mobile?.trim() || null;
    if (mobile) {
      const existingMobile = await this.userRepository.findOne({
        where: { mobile },
      });
      if (existingMobile) {
        throw new ConflictException('Mobile number already exists');
      }
    }

    // The database unique constraint remains the final protection against races.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const username = `student-${randomBytes(6).toString('hex')}`;
      const existingUsername = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUsername) continue;

      const temporaryPassword = randomBytes(18).toString('base64url');
      const student = this.userRepository.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        mobile,
        mobileVerified: false,
        username,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        role: UserRole.STUDENT,
        institution,
        isActive: true,
      });

      try {
        const saved = await this.userRepository.save(student);
        return {
          student: {
            id: saved.id,
            firstName: saved.firstName,
            lastName: saved.lastName,
            mobile: saved.mobile,
            username: saved.username,
            role: saved.role,
            institutionId,
            mobileVerified: saved.mobileVerified,
            isActive: saved.isActive,
            createdAt: saved.createdAt,
          },
          // Show this only once when the account is created; never store plaintext.
          temporaryPassword,
        };
      } catch (error) {
        // Retry only a username collision; report other database errors.
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === '23505' &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Could not generate a unique student username. Please retry.');
  }

  async listStudents(institutionId: string) {
    const students = await this.userRepository.find({
      where: {
        role: UserRole.STUDENT,
        institution: { id: institutionId },
      },
      order: { createdAt: 'DESC' },
    });

    return students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      mobile: student.mobile,
      username: student.username,
      role: student.role,
      institutionId,
      mobileVerified: student.mobileVerified,
      isActive: student.isActive,
      createdAt: student.createdAt,
    }));
  }

  async deactivateStudent(institutionId: string, studentId: string) {
    const student = await this.findInstitutionStudent(institutionId, studentId);
    student.isActive = false;
    const saved = await this.userRepository.save(student);
    return { id: saved.id, username: saved.username, isActive: saved.isActive };
  }

  async deleteStudent(institutionId: string, studentId: string) {
    const student = await this.findInstitutionStudent(institutionId, studentId);
    await this.userRepository.remove(student);
    return { id: studentId, deleted: true };
  }

  private async findInstitutionStudent(institutionId: string, studentId: string) {
    const student = await this.userRepository.findOne({
      where: {
        id: studentId,
        role: UserRole.STUDENT,
        institution: { id: institutionId },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found in your institution');
    }
    return student;
  }
}
