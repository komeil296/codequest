import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { UsersService } from './users.service';
import { CreateInstitutionAdminDto } from './dto/create-institution-admin.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    role: UserRole;
    institutionId: string | null;
  };
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('institution-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an institution administrator (super admin only)' })
  @ApiCreatedResponse({ description: 'Institution administrator created successfully.' })
  createInstitutionAdmin(@Body() dto: CreateInstitutionAdminDto) {
    return this.usersService.createInstitutionAdmin(dto);
  }

  @Post('students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a student in the current administrator institution' })
  createStudent(@Req() request: AuthenticatedRequest, @Body() dto: CreateStudentDto) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.createStudent(institutionId, dto);
  }

  @Get('students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List students belonging to the current institution' })
  listStudents(@Req() request: AuthenticatedRequest) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.listStudents(institutionId);
  }

  @Patch('students/:studentId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a student belonging to the current institution' })
  deactivateStudent(@Req() request: AuthenticatedRequest, @Param('studentId') studentId: string) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.deactivateStudent(institutionId, studentId);
  }

  @Delete('students/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a student belonging to the current institution' })
  deleteStudent(@Req() request: AuthenticatedRequest, @Param('studentId') studentId: string) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.deleteStudent(institutionId, studentId);
  }
}
