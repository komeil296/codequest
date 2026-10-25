import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLessonQuestions1761000000000 implements MigrationInterface {
  name = 'AddLessonQuestions1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "lesson_questions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "lessonId" uuid NOT NULL,
      "prompt" character varying(500) NOT NULL,
      "options" jsonb NOT NULL,
      "correctOptionIndex" integer NOT NULL,
      "points" integer NOT NULL DEFAULT 10,
      "coins" integer NOT NULL DEFAULT 5,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_lesson_questions_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_lesson_questions_lesson" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);
    await queryRunner.query(`CREATE TABLE "lesson_question_answers" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "studentId" uuid NOT NULL,
      "questionId" uuid NOT NULL,
      "selectedOptionIndex" integer NOT NULL,
      "isCorrect" boolean NOT NULL DEFAULT false,
      "awardedPoints" integer NOT NULL DEFAULT 0,
      "awardedCoins" integer NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_lesson_question_answers_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_lesson_question_answers_student_question" UNIQUE ("studentId", "questionId"),
      CONSTRAINT "FK_lesson_question_answers_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "FK_lesson_question_answers_question" FOREIGN KEY ("questionId") REFERENCES "lesson_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "lesson_question_answers"');
    await queryRunner.query('DROP TABLE "lesson_questions"');
  }
}
