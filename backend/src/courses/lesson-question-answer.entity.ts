import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { LessonQuestion } from './lesson-question.entity';

@Entity('lesson_question_answers')
@Unique('UQ_lesson_question_answers_student_question', ['student', 'question'])
export class LessonQuestionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => LessonQuestion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: LessonQuestion;

  @Column({ type: 'integer' })
  selectedOptionIndex: number;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ type: 'integer', default: 0 })
  awardedPoints: number;

  @Column({ type: 'integer', default: 0 })
  awardedCoins: number;

  @CreateDateColumn()
  createdAt: Date;
}
