import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoursesAndLessons1793100000000 implements MigrationInterface {
  name = 'CreateCoursesAndLessons1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_courses_id" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "courseId" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text, "content" text, "sortOrder" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_lessons_id" PRIMARY KEY ("id"), CONSTRAINT "FK_lessons_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION)');
    await queryRunner.query('CREATE INDEX "IDX_lessons_courseId_sortOrder" ON "lessons" ("courseId", "sortOrder")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_lessons_courseId_sortOrder"');
    await queryRunner.query('DROP TABLE "lessons"');
    await queryRunner.query('DROP TABLE "courses"');
  }
}
