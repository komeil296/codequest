import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { StudentCourseService } from './student-course.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; role: UserRole };
}

@ApiTags('Student courses')
@Controller('student-courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class StudentCourseController {
  constructor(private readonly studentCourseService: StudentCourseService) {}

  @Get()
  @ApiOperation({ summary: 'List courses the current student is enrolled in' })
  listMyCourses(@Req() request: AuthenticatedRequest) {
    return this.studentCourseService.listMyCourses(request.user.id);
  }

  @Get(':courseId/lessons')
  @ApiOperation({ summary: 'List active lessons for a course the current student is enrolled in' })
  listCourseLessons(
    @Req() request: AuthenticatedRequest,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.studentCourseService.listCourseLessons(request.user.id, courseId);
  }
}
