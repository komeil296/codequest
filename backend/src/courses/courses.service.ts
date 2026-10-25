import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(dto: CreateCourseDto) {
    const course = this.courseRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
    });

    return this.courseRepository.save(course);
  }

  findAll() {
    return this.courseRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.findCourse(id);

    if (dto.title !== undefined) course.title = dto.title.trim();
    if (dto.description !== undefined) {
      course.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) course.isActive = dto.isActive;

    return this.courseRepository.save(course);
  }

  async setActive(id: string, isActive: boolean) {
    const course = await this.findCourse(id);
    course.isActive = isActive;
    const saved = await this.courseRepository.save(course);

    return { id: saved.id, title: saved.title, isActive: saved.isActive };
  }

  private async findCourse(id: string) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }
}
