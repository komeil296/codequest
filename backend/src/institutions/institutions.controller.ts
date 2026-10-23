
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Institutions')
@Controller('institutions')
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active institutions' })
  @ApiOkResponse({
    description: 'Active institutions retrieved successfully.',
  })
  findActive() {
    return this.institutionsService.findActive();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an institution (super admin only)',
  })
  @ApiCreatedResponse({
    description: 'Institution created successfully and left inactive.',
  })
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate an institution (super admin only)',
  })
  @ApiOkResponse({
    description: 'Institution activated successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Institution not found.',
  })
  activate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.institutionsService.activate(id);
  }
}
