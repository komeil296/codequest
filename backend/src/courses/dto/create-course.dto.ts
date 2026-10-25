import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'JavaScript مقدماتی', minLength: 2, maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'آموزش پایه‌های JavaScript' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
