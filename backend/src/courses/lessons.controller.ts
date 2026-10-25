import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Lessons')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Create a lesson definition (super admin only)' })
  @ApiCreatedResponse({ description: 'Lesson definition created successfully.' })
  create(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(courseId, dto);
  }

  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'List lesson definitions for a course (super admin only)' })
  @ApiOkResponse({ description: 'Lesson definitions retrieved successfully.' })
  findAllByCourse(@Param('courseId', new ParseUUIDPipe()) courseId: string) {
    return this.lessonsService.findAllByCourse(courseId);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson definition (super admin only)' })
  @ApiOkResponse({ description: 'Lesson definition updated successfully.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, dto);
  }

  @Patch('lessons/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a lesson (super admin only)' })
  @ApiOkResponse({ description: 'Lesson deactivated successfully.' })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.lessonsService.setActive(id, false);
  }

  @Patch('lessons/:id/activate')
  @ApiOperation({ summary: 'Activate a lesson (super admin only)' })
  @ApiOkResponse({ description: 'Lesson activated successfully.' })
  activate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.lessonsService.setActive(id, true);
  }
}
