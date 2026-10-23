import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'bcryptPasswordLength', async: false })
class BcryptPasswordLengthConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      Buffer.byteLength(value, 'utf8') <= 72
    );
  }

  defaultMessage(): string {
    return 'Password must not exceed 72 bytes in UTF-8';
  }
}

export class CreateInstitutionAdminDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: 'Ahmadi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile: string;

  @ApiProperty({ example: 'ali_admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @ApiProperty({
    example: 'A-Strong-Password-123',
    minLength: 10,
    writeOnly: true,
  })
  @IsString()
  @MinLength(10)
  @Validate(BcryptPasswordLengthConstraint)
  password: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the institution',
    format: 'uuid',
  })
  @IsUUID()
  institutionId: string;
}
