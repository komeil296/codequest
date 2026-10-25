import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Course } from './course.entity';
import { CourseEnrollment } from './course-enrollment.entity';
import { CourseInstitutionAccess } from './course-institution-access.entity';
import { Institution } from '../institutions/institution.entity';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class CourseEnrollmentService {
  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(CourseInstitutionAccess)
    private readonly accessRepository: Repository<CourseInstitutionAccess>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  async listAvailableCourses(institutionId: string) {
    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId, isActive: true },
    });
    if (!institution) throw new NotFoundException('Active institution not found');

    const accesses = await this.accessRepository.find({
      where: { institution: { id: institutionId }, isActive: true },
      relations: { course: true },
      order: { createdAt: 'DESC' },
    });

    return accesses
      .filter(({ course }) => course?.isActive)
      .map(({ course }) => ({
        id: course.id,
        title: course.title,
        description: course.description,
      }));
  }

  async listCourseEnrollments(courseId: string, institutionId: string) {
    await this.assertCourseAvailable(courseId, institutionId);

    const enrollments = await this.enrollmentRepository.find({
      where: {
        course: { id: courseId },
        student: { institution: { id: institutionId }, role: UserRole.STUDENT },
      },
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });

    return enrollments.map(({ id, student, createdAt }) => ({
      id,
      createdAt,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
        isActive: student.isActive,
      },
    }));
  }

  async enrollStudents(courseId: string, institutionId: string, requestedStudentIds: string[]) {
    await this.assertCourseAvailable(courseId, institutionId);

    const studentIds = [...new Set(requestedStudentIds)];
    if (studentIds.length === 0) {
      throw new BadRequestException('Select at least one student');
    }

    const students = await this.userRepository.find({
      where: {
        id: In(studentIds),
        role: UserRole.STUDENT,
        institution: { id: institutionId },
        isActive: true,
      },
    });

    if (students.length !== studentIds.length) {
      throw new ForbiddenException(
        'Every selected student must be active and belong to your institution',
      );
    }

    const existing = await this.enrollmentRepository.find({
      where: {
        course: { id: courseId },
        student: { id: In(studentIds) },
      },
      relations: { student: true },
    });
    const existingIds = new Set(existing.map(({ student }) => student.id));
    const newEnrollments = students
      .filter((student) => !existingIds.has(student.id))
      .map((student) => this.enrollmentRepository.create({
        course: { id: courseId } as Course,
        student,
      }));

    if (newEnrollments.length) {
      await this.enrollmentRepository.save(newEnrollments);
    }

    return {
      courseId,
      enrolledCount: newEnrollments.length,
      alreadyEnrolledCount: existingIds.size,
      message: 'Course enrollment processed successfully',
    };
  }

  private async assertCourseAvailable(courseId: string, institutionId: string) {
    const [course, institution, access] = await Promise.all([
      this.courseRepository.findOne({ where: { id: courseId, isActive: true } }),
      this.institutionRepository.findOne({ where: { id: institutionId, isActive: true } }),
      this.accessRepository.findOne({
        where: {
          course: { id: courseId },
          institution: { id: institutionId },
          isActive: true,
        },
      }),
    ]);

    if (!course) throw new NotFoundException('Active course not found');
    if (!institution) throw new NotFoundException('Active institution not found');
    if (!access) {
      throw new ForbiddenException('This course is not available to your institution');
    }
  }
}
