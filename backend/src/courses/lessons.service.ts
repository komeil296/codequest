import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(courseId: string, dto: CreateLessonDto) {
    const course = await this.findCourse(courseId);
    const sortOrder = dto.sortOrder ?? await this.nextSortOrder(courseId);

    const lesson = this.lessonRepository.create({
      course,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      sortOrder,
    });

    return this.lessonRepository.save(lesson);
  }

  async findAllByCourse(courseId: string) {
    await this.findCourse(courseId);
    return this.lessonRepository.find({
      where: { course: { id: courseId } },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    const lesson = await this.findLesson(id);

    if (dto.title !== undefined) lesson.title = dto.title.trim();
    if (dto.description !== undefined) {
      lesson.description = dto.description?.trim() || null;
    }
    if (dto.sortOrder !== undefined) lesson.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) lesson.isActive = dto.isActive;

    return this.lessonRepository.save(lesson);
  }

  async setActive(id: string, isActive: boolean) {
    const lesson = await this.findLesson(id);
    lesson.isActive = isActive;
    const saved = await this.lessonRepository.save(lesson);

    return {
      id: saved.id,
      courseId: (await this.lessonRepository.findOne({
        where: { id: saved.id },
        relations: { course: true },
      }))?.course.id,
      title: saved.title,
      isActive: saved.isActive,
    };
  }

  private async findCourse(id: string) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async findLesson(id: string) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  private async nextSortOrder(courseId: string) {
    const lastLesson = await this.lessonRepository.findOne({
      where: { course: { id: courseId } },
      order: { sortOrder: 'DESC' },
    });
    return lastLesson ? lastLesson.sortOrder + 1 : 0;
  }
}
