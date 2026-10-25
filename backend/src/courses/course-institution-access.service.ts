import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './course.entity';
import { CourseInstitutionAccess } from './course-institution-access.entity';
import { Institution } from '../institutions/institution.entity';

@Injectable()
export class CourseInstitutionAccessService {
  constructor(
    @InjectRepository(CourseInstitutionAccess)
    private readonly accessRepository: Repository<CourseInstitutionAccess>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  findAll() {
    return this.accessRepository.find({
      relations: { course: true, institution: true },
      order: { createdAt: 'DESC' },
    });
  }

  async grant(courseId: string, institutionId: string) {
    const [course, institution] = await Promise.all([
      this.courseRepository.findOne({ where: { id: courseId } }),
      this.institutionRepository.findOne({ where: { id: institutionId } }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!institution) throw new NotFoundException('Institution not found');
    if (!course.isActive) {
      throw new BadRequestException('An inactive course cannot be released to an institution');
    }
    if (!institution.isActive) {
      throw new BadRequestException('An inactive institution cannot receive a course');
    }

    let access = await this.accessRepository.findOne({
      where: {
        course: { id: courseId },
        institution: { id: institutionId },
      },
      relations: { course: true, institution: true },
    });

    if (access) {
      if (!access.isActive) {
        access.isActive = true;
        access = await this.accessRepository.save(access);
      }
      return access;
    }

    access = this.accessRepository.create({
      course,
      institution,
      isActive: true,
    });

    return this.accessRepository.save(access);
  }

  async revoke(courseId: string, institutionId: string) {
    const access = await this.accessRepository.findOne({
      where: {
        course: { id: courseId },
        institution: { id: institutionId },
      },
      relations: { course: true, institution: true },
    });

    if (!access) throw new NotFoundException('Course access not found');

    if (access.isActive) {
      access.isActive = false;
      await this.accessRepository.save(access);
    }

    return {
      id: access.id,
      courseId,
      institutionId,
      isActive: false,
    };
  }
}
