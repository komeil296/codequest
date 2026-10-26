import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessions1792970000000 implements MigrationInterface {
  name = 'AddAuthSessions1792970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "auth_sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "refreshTokenHash" character varying(64) NOT NULL,
      "csrfTokenHash" character varying(64) NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "revokedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_auth_sessions_refreshTokenHash" UNIQUE ("refreshTokenHash"),
      CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_userId" ON "auth_sessions" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_auth_sessions_userId"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
  }
}
