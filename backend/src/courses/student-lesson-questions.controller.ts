import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { SubmitLessonQuestionAnswerDto } from './dto/submit-lesson-question-answer.dto';
import { LessonQuestionsService } from './lesson-questions.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; role: UserRole };
}

@ApiTags('Student lesson questions')
@Controller('student-courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class StudentLessonQuestionsController {
  constructor(private readonly questionsService: LessonQuestionsService) {}

  @Get('lessons/:lessonId/questions')
  @ApiOperation({ summary: 'List active multiple-choice questions without answer keys' })
  list(@Req() request: AuthenticatedRequest, @Param('lessonId', new ParseUUIDPipe()) lessonId: string) {
    return this.questionsService.listForStudent(request.user.id, lessonId);
  }

  @Post('questions/:questionId/answer')
  @ApiOperation({ summary: 'Submit one answer and award the configured points and coins once' })
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() dto: SubmitLessonQuestionAnswerDto,
  ) {
    return this.questionsService.submit(request.user.id, questionId, dto.selectedOptionIndex);
  }
}
