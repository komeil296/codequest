
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { User } from '../users/user.entity';
import { Institution } from '../institutions/institution.entity';

export interface DatabaseEnvironment {
  DB_HOST?: string;
  DB_PORT?: string | number;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_DATABASE?: string;
}

export function buildTypeOrmOptions(
  env: DatabaseEnvironment,
): DataSourceOptions {
  const required = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ] as const;

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing database configuration: ${key}`);
    }
  }

  const port = Number(env.DB_PORT ?? 5432);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid port number');
  }

  return {
    type: 'postgres',
    host: env.DB_HOST!,
    port,
    username: env.DB_USERNAME!,
    password: env.DB_PASSWORD!,
    database: env.DB_DATABASE!,
    entities: [User, Institution],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    synchronize: false,
  };
}
