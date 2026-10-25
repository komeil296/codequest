import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CourseEnrollment } from './course-enrollment.entity';
import { Lesson } from './lesson.entity';

@Injectable()
export class StudentCourseService {
  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async listMyCourses(studentId: string) {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: studentId } },
      relations: { course: true },
      order: { createdAt: 'DESC' },
    });

    return enrollments
      .filter(({ course }) => Boolean(course))
      .map(({ id, createdAt, course }) => ({
        enrollmentId: id,
        enrolledAt: createdAt,
        id: course.id,
        title: course.title,
        description: course.description,
        isActive: course.isActive,
      }));
  }

  async listCourseLessons(studentId: string, courseId: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { student: { id: studentId }, course: { id: courseId } },
      relations: { course: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const lessons = await this.lessonRepository.find({
      where: { course: { id: courseId }, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return {
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
      },
      lessons: lessons.map(({ id, title, description, content, sortOrder }) => ({
        id,
        title,
        description,
        content,
        sortOrder,
      })),
    };
  }
}
