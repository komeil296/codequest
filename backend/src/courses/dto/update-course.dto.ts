import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'JavaScript مقدماتی', minLength: 2, maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'آموزش پایه‌های JavaScript', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
