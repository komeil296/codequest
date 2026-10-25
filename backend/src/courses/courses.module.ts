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

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Lesson, CourseInstitutionAccess, Institution]),
  ],
  controllers: [
    CoursesController,
    LessonsController,
    CourseInstitutionAccessController,
  ],
  providers: [CoursesService, LessonsService, CourseInstitutionAccessService],
  exports: [CoursesService, LessonsService, CourseInstitutionAccessService],
})
export class CoursesModule {}
