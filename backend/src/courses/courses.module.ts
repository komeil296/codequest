import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson])],
  controllers: [CoursesController, LessonsController],
  providers: [CoursesService, LessonsService],
  exports: [CoursesService, LessonsService],
})
export class CoursesModule {}
