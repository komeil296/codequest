import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Institution } from '../institutions/institution.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
  STUDENT = 'STUDENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true, length: 20 })
  mobile: string;

  @Column({ default: false })
  mobileVerified: boolean;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @ManyToOne(() => Institution, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution | null;

  @CreateDateColumn()
  createdAt: Date;
}
