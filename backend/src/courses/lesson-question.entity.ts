import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Lesson } from './lesson.entity';

@Entity('lesson_questions')
export class LessonQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lesson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column({ length: 500 })
  prompt: string;

  @Column({ type: 'jsonb' })
  options: string[];

  @Column({ type: 'integer' })
  correctOptionIndex: number;

  @Column({ type: 'integer', default: 10 })
  points: number;

  @Column({ type: 'integer', default: 5 })
  coins: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
