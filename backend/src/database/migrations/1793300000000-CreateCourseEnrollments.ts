import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseEnrollments1793300000000 implements MigrationInterface {
  name = 'CreateCourseEnrollments1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "courseId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_enrollments_course_student" UNIQUE ("courseId", "studentId"),
        CONSTRAINT "FK_course_enrollments_course" FOREIGN KEY ("courseId")
          REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_course_enrollments_student" FOREIGN KEY ("studentId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_course_enrollments_studentId" ON "course_enrollments" ("studentId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_course_enrollments_studentId"');
    await queryRunner.query('DROP TABLE "course_enrollments"');
  }
}
