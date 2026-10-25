import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { CourseEnrollmentService } from './course-enrollment.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    role: UserRole;
    institutionId: string | null;
  };
}

@ApiTags('Course enrollment')
@Controller('course-enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTITUTION_ADMIN)
@ApiBearerAuth()
export class CourseEnrollmentController {
  constructor(private readonly enrollmentService: CourseEnrollmentService) {}

  @Get('courses')
  @ApiOperation({ summary: 'List courses released to the current institution' })
  listAvailableCourses(@Req() request: AuthenticatedRequest) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.enrollmentService.listAvailableCourses(institutionId);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'List students enrolled in a course available to this institution' })
  listCourseEnrollments(
    @Req() request: AuthenticatedRequest,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.enrollmentService.listCourseEnrollments(courseId, institutionId);
  }

  @Post(':courseId')
  @ApiOperation({ summary: 'Enroll active students from the current institution into a released course' })
  enrollStudents(
    @Req() request: AuthenticatedRequest,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: EnrollStudentsDto,
  ) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.enrollmentService.enrollStudents(courseId, institutionId, dto.studentIds);
  }
}
