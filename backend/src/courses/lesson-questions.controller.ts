import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateLessonQuestionDto } from './dto/create-lesson-question.dto';
import { LessonQuestionsService } from './lesson-questions.service';

@ApiTags('Lesson questions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class LessonQuestionsController {
  constructor(private readonly questionsService: LessonQuestionsService) {}

  @Post('lessons/:lessonId/questions')
  @ApiOperation({ summary: 'Create a multiple-choice question for a lesson' })
  @ApiCreatedResponse({ description: 'Question created.' })
  create(@Param('lessonId', new ParseUUIDPipe()) lessonId: string, @Body() dto: CreateLessonQuestionDto) {
    return this.questionsService.create(lessonId, dto);
  }

  @Get('lessons/:lessonId/questions')
  @ApiOperation({ summary: 'List lesson questions for the administrator, including answer keys' })
  list(@Param('lessonId', new ParseUUIDPipe()) lessonId: string) {
    return this.questionsService.listForAdmin(lessonId);
  }
}
