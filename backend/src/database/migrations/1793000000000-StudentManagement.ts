import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentManagement1793000000000 implements MigrationInterface {
  name = 'StudentManagement1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM ('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'STUDENT');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "mobile" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`);
    // Do not restore NOT NULL on mobile: existing student records may have no number.
  }
}
