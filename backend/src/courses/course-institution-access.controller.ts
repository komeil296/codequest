import {
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CourseInstitutionAccessService } from './course-institution-access.service';

@ApiTags('Course access')
@Controller('course-access')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CourseInstitutionAccessController {
  constructor(
    private readonly accessService: CourseInstitutionAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List course access assignments (super admin only)' })
  @ApiOkResponse({ description: 'Course access assignments retrieved successfully.' })
  findAll() {
    return this.accessService.findAll();
  }

  @Post(':courseId/:institutionId')
  @ApiOperation({ summary: 'Release a course to an institution (super admin only)' })
  @ApiOkResponse({ description: 'Course access enabled successfully.' })
  grant(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Param('institutionId', new ParseUUIDPipe()) institutionId: string,
  ) {
    return this.accessService.grant(courseId, institutionId);
  }

  @Patch(':courseId/:institutionId/deactivate')
  @ApiOperation({ summary: 'Revoke course access for an institution (super admin only)' })
  @ApiOkResponse({ description: 'Course access disabled successfully.' })
  revoke(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Param('institutionId', new ParseUUIDPipe()) institutionId: string,
  ) {
    return this.accessService.revoke(courseId, institutionId);
  }
}
