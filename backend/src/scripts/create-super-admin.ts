
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { User, UserRole } from '../users/user.entity';

async function bootstrap() {
  const requiredVariables = [
    'SUPER_ADMIN_FIRST_NAME',
    'SUPER_ADMIN_LAST_NAME',
    'SUPER_ADMIN_MOBILE',
    'SUPER_ADMIN_USERNAME',
    'SUPER_ADMIN_PASSWORD',
  ];

  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(', ')}`,
    );
  }

  const password = process.env.SUPER_ADMIN_PASSWORD!;

  if (password.length < 12 || password.length > 72) {
    throw new Error('Super admin password must be 12–72 characters long.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users = app.get<Repository<User>>(getRepositoryToken(User));

    const existingAdmin = await users.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingAdmin) {
      throw new Error(
        'A super admin already exists. No account was created.',
      );
    }

    const username = process.env.SUPER_ADMIN_USERNAME!.trim();
    const mobile = process.env.SUPER_ADMIN_MOBILE!.trim();

    const existingUser = await users.findOne({
      where: [{ username }, { mobile }],
    });

    if (existingUser) {
      throw new Error(
        'The specified username or mobile number is already in use.',
      );
    }

    const user = users.create({
      firstName: process.env.SUPER_ADMIN_FIRST_NAME!.trim(),
      lastName: process.env.SUPER_ADMIN_LAST_NAME!.trim(),
      mobile,
      mobileVerified: true,
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.SUPER_ADMIN,
      institution: null,
    });

    await users.save(user);

    console.log(`Super admin created successfully. Username: ${username}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Failed to create super admin.',
  );
  process.exitCode = 1;
});
