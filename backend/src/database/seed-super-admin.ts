import 'dotenv/config';

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '../users/user.entity';
import { buildTypeOrmOptions } from './typeorm-options';

async function seedSuperAdmin(): Promise<void> {
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim();
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim();
  const mobile = process.env.SUPER_ADMIN_MOBILE?.trim();
  const username = process.env.SUPER_ADMIN_USERNAME?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!firstName || !lastName || !mobile || !username || !password) {
    throw new Error('Missing SUPER_ADMIN_* environment variables.');
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Super Admin password must be 12–72 bytes in UTF-8.');
  }

  const dataSource = new DataSource(buildTypeOrmOptions(process.env));
  await dataSource.initialize();

  try {
    const users = dataSource.getRepository(User);
    const existingUser = await users.findOne({
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
      throw new Error('The username or mobile already belongs to another user.');
    }

    const superAdmin = users.create({
      firstName,
      lastName,
      mobile,
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.SUPER_ADMIN,
      mobileVerified: true,
      isActive: true,
      institution: null,
    });

    await users.save(superAdmin);
    console.log('Super Admin created successfully.');
  } finally {
    await dataSource.destroy();
  }
}

seedSuperAdmin().catch((error: unknown) => {
  console.error('Failed to create Super Admin:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
