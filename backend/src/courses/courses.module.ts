import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { CourseInstitutionAccess } from './course-institution-access.entity';
import { Institution } from '../institutions/institution.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { CourseInstitutionAccessController } from './course-institution-access.controller';
import { CourseInstitutionAccessService } from './course-institution-access.service';
import { CourseEnrollment } from './course-enrollment.entity';
import { CourseEnrollmentController } from './course-enrollment.controller';
import { CourseEnrollmentService } from './course-enrollment.service';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Lesson, CourseInstitutionAccess, CourseEnrollment, Institution, User]),
  ],
  controllers: [
    CoursesController,
    LessonsController,
    CourseInstitutionAccessController,
    CourseEnrollmentController,
  ],
  providers: [CoursesService, LessonsService, CourseInstitutionAccessService, CourseEnrollmentService],
  exports: [CoursesService, LessonsService, CourseInstitutionAccessService, CourseEnrollmentService],
})
export class CoursesModule {}
