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

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a course (super admin only)' })
  @ApiCreatedResponse({ description: 'Course created successfully.' })
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List courses (super admin only)' })
  @ApiOkResponse({ description: 'Courses retrieved successfully.' })
  findAll() {
    return this.coursesService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course (super admin only)' })
  @ApiOkResponse({ description: 'Course updated successfully.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a course (super admin only)' })
  @ApiOkResponse({ description: 'Course deactivated successfully.' })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.coursesService.setActive(id, false);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a course (super admin only)' })
  @ApiOkResponse({ description: 'Course activated successfully.' })
  activate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.coursesService.setActive(id, true);
  }
}
