import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseInstitutionAccess1793200000000 implements MigrationInterface {
  name = 'CreateCourseInstitutionAccess1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_institution_access" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "courseId" uuid NOT NULL,
        "institutionId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_institution_access_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_institution_access_course_institution" UNIQUE ("courseId", "institutionId"),
        CONSTRAINT "FK_course_institution_access_course" FOREIGN KEY ("courseId")
          REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_course_institution_access_institution" FOREIGN KEY ("institutionId")
          REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_course_institution_access_institutionId" ON "course_institution_access" ("institutionId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_course_institution_access_institutionId"');
    await queryRunner.query('DROP TABLE "course_institution_access"');
  }
}
