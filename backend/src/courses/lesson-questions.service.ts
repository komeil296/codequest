import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollment } from './course-enrollment.entity';
import { Lesson } from './lesson.entity';
import { LessonQuestion } from './lesson-question.entity';
import { LessonQuestionAnswer } from './lesson-question-answer.entity';
import { CreateLessonQuestionDto } from './dto/create-lesson-question.dto';

@Injectable()
export class LessonQuestionsService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonQuestion) private readonly questionRepository: Repository<LessonQuestion>,
    @InjectRepository(LessonQuestionAnswer) private readonly answerRepository: Repository<LessonQuestionAnswer>,
    @InjectRepository(CourseEnrollment) private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async create(lessonId: string, dto: CreateLessonQuestionDto) {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (dto.correctOptionIndex >= dto.options.length) {
      throw new ConflictException('Correct option must match one of the provided options');
    }
    const options = dto.options.map(option => option.trim());
    if (options.some(option => !option) || new Set(options).size !== options.length) {
      throw new ConflictException('Options must be non-empty and unique');
    }
    return this.questionRepository.save(this.questionRepository.create({
      lesson, prompt: dto.prompt.trim(), options,
      correctOptionIndex: dto.correctOptionIndex, points: dto.points, coins: dto.coins,
    }));
  }

  async listForAdmin(lessonId: string) {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.questionRepository.find({ where: { lesson: { id: lessonId } }, order: { createdAt: 'ASC' } });
  }

  async listForStudent(studentId: string, lessonId: string) {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId, isActive: true }, relations: { course: true } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.enrollmentRepository.findOne({
      where: { student: { id: studentId }, course: { id: lesson.course.id } },
    });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course');

    const questions = await this.questionRepository.find({
      where: { lesson: { id: lessonId }, isActive: true },
      order: { createdAt: 'ASC' },
    });
    const answers = await this.answerRepository.find({ where: { student: { id: studentId } }, relations: { question: true } });
    const answerByQuestion = new Map(answers.map(answer => [answer.question.id, answer]));
    return questions.map(question => {
      const answer = answerByQuestion.get(question.id);
      return {
        id: question.id,
        prompt: question.prompt,
        options: question.options,
        points: question.points,
        coins: question.coins,
        answered: Boolean(answer?.isCorrect),
        isCorrect: answer?.isCorrect ?? null,
        awardedPoints: answer?.awardedPoints ?? 0,
        awardedCoins: answer?.awardedCoins ?? 0,
        selectedOptionIndex: answer?.selectedOptionIndex ?? null,
      };
    });
  }

  async submit(studentId: string, questionId: string, selectedOptionIndex: number) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId, isActive: true },
      relations: { lesson: { course: true } },
    });
    if (!question) throw new NotFoundException('Question not found');
    const enrollment = await this.enrollmentRepository.findOne({
      where: { student: { id: studentId }, course: { id: question.lesson.course.id } },
    });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course');
    if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
      throw new ConflictException('Selected option is invalid');
    }

    const existing = await this.answerRepository.findOne({
      where: { student: { id: studentId }, question: { id: questionId } },
      relations: { question: true },
    });
    if (existing?.isCorrect) {
      return {
        alreadyAnswered: true,
        isCorrect: true,
        awardedPoints: existing.awardedPoints,
        awardedCoins: existing.awardedCoins,
        selectedOptionIndex: existing.selectedOptionIndex,
        message: 'این سؤال قبلاً درست پاسخ داده شده است؛ جایزه دوباره ثبت نمی‌شود.',
      };
    }

    const isCorrect = selectedOptionIndex === question.correctOptionIndex;
    const answer = existing ?? this.answerRepository.create({
      student: { id: studentId } as any,
      question,
      selectedOptionIndex,
      isCorrect,
      awardedPoints: 0,
      awardedCoins: 0,
    });
    answer.selectedOptionIndex = selectedOptionIndex;
    answer.isCorrect = isCorrect;
    answer.awardedPoints = isCorrect ? question.points : 0;
    answer.awardedCoins = isCorrect ? question.coins : 0;
    try {
      const saved = await this.answerRepository.save(answer);
      return {
        alreadyAnswered: false,
        isCorrect: saved.isCorrect,
        awardedPoints: saved.awardedPoints,
        awardedCoins: saved.awardedCoins,
        selectedOptionIndex: saved.selectedOptionIndex,
        message: saved.isCorrect ? 'آفرین! پاسخ درست است و جایزه‌ات ثبت شد.' : 'پاسخ درست نبود؛ می‌توانی دوباره تلاش کنی.',
      };
    } catch (error) {
      // A simultaneous second request must not award the same question twice.
      const previous = await this.answerRepository.findOne({
        where: { student: { id: studentId }, question: { id: questionId } },
      });
      if (previous) {
        return {
          alreadyAnswered: true,
          isCorrect: previous.isCorrect,
          awardedPoints: previous.awardedPoints,
          awardedCoins: previous.awardedCoins,
          selectedOptionIndex: previous.selectedOptionIndex,
          message: 'این سؤال قبلاً پاسخ داده شده است؛ جایزه دوباره ثبت نمی‌شود.',
        };
      }
      throw error;
    }
  }
}
