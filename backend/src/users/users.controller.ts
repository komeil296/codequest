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
import { CreateStudentForInstitutionDto } from './dto/create-student-for-institution.dto';
import { ChangeStudentPasswordDto } from './dto/change-student-password.dto';
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

  @Post('admin/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a student for a selected institution (super admin only)' })
  createStudentForInstitution(@Body() dto: CreateStudentForInstitutionDto) {
    return this.usersService.createStudent(dto.institutionId, dto);
  }

  @Get('admin/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all students across institutions (super admin only)' })
  listAllStudents() {
    return this.usersService.listAllStudents();
  }

  @Patch('admin/students/:studentId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a student (super admin only)' })
  deactivateAnyStudent(@Param('studentId') studentId: string) {
    return this.usersService.setStudentActive(studentId, false);
  }

  @Patch('admin/students/:studentId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a student (super admin only)' })
  activateAnyStudent(@Param('studentId') studentId: string) {
    return this.usersService.setStudentActive(studentId, true);
  }

  @Patch('admin/students/:studentId/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a student password (super admin only)' })
  changeAnyStudentPassword(
    @Param('studentId') studentId: string,
    @Body() dto: ChangeStudentPasswordDto,
  ) {
    return this.usersService.changeStudentPasswordById(studentId, dto.password);
  }

  @Delete('admin/students/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a student (super admin only)' })
  deleteAnyStudent(@Param('studentId') studentId: string) {
    return this.usersService.deleteStudentById(studentId);
  }

  @Post('institution-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an institution administrator (super admin only)' })
  @ApiCreatedResponse({ description: 'Institution administrator created successfully.' })
  createInstitutionAdmin(@Body() dto: CreateInstitutionAdminDto) {
    return this.usersService.createInstitutionAdmin(dto);
  }

  @Get('admin/institution-admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List institution administrators (super admin only)' })
  listInstitutionAdmins() {
    return this.usersService.listAllInstitutionAdmins();
  }

  @Patch('admin/institution-admins/:adminId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an institution administrator (super admin only)' })
  deactivateInstitutionAdmin(@Param('adminId') adminId: string) {
    return this.usersService.setInstitutionAdminActive(adminId, false);
  }

  @Patch('admin/institution-admins/:adminId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate an institution administrator (super admin only)' })
  activateInstitutionAdmin(@Param('adminId') adminId: string) {
    return this.usersService.setInstitutionAdminActive(adminId, true);
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

  @Patch('students/:studentId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a student belonging to the current institution' })
  activateStudent(@Req() request: AuthenticatedRequest, @Param('studentId') studentId: string) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.activateStudent(institutionId, studentId);
  }

  @Patch('students/:studentId/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a new password for a student in the current institution' })
  changeStudentPassword(
    @Req() request: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Body() dto: ChangeStudentPasswordDto,
  ) {
    const institutionId = request.user.institutionId;
    if (!institutionId) throw new NotFoundException('Administrator institution not found');
    return this.usersService.changeStudentPassword(institutionId, studentId, dto.password);
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
