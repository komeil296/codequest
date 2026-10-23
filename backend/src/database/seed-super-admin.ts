import 'dotenv/config';

import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

import { User, UserRole } from '../users/user.entity';
import { buildTypeOrmOptions } from './typeorm-options';

async function seedSuperAdmin(): Promise<void> {
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME;
  const lastName = process.env.SUPER_ADMIN_LAST_NAME;
  const mobile = process.env.SUPER_ADMIN_MOBILE;
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!firstName || !lastName || !mobile || !username || !password) {
    throw new Error('Missing SUPER_ADMIN_* environment variables.');
  }

  if (password.length < 12) {
    throw new Error('Super Admin password must be at least 12 characters.');
  }

  const dataSource = new DataSource(
    buildTypeOrmOptions(process.env),
  );

  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);

    const existingUser = await userRepository.findOne({
      where: [{ username }, { mobile }],
    });

    if (existingUser) {
      if (
        existingUser.username === username &&
        existingUser.mobile === mobile &&
        existingUser.role === UserRole.SUPER_ADMIN
      ) {
        console.log('Super Admin already exists. No changes made.');
        return;
      }

      throw new Error(
        'The username or mobile already belongs to another user.',
      );
    }

    const passwordHash = await argon2.hash(password);

    const superAdmin = userRepository.create({
      firstName,
      lastName,
      mobile,
      username,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      mobileVerified: false,
      institution: null,
    });

    await userRepository.save(superAdmin);

    console.log('Super Admin created successfully.');
  } finally {
    await dataSource.destroy();
  }
}

seedSuperAdmin().catch((error: unknown) => {
  console.error('Failed to create Super Admin:', error);
  process.exitCode = 1;
});
