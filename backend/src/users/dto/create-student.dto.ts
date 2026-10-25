import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStudentDto {
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

  @ApiPropertyOptional({
    example: '09123456789',
    description: 'Optional. A supplied mobile number must be verified before login.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;
}
