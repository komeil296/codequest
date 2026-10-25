import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLessonQuestionDto {
  @ApiProperty({ example: 'کدام کلمه برای تعریف متغیر در جاوااسکریپت استفاده می‌شود؟', maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  prompt: string;

  @ApiProperty({ example: ['let', 'print', 'echo', 'write'], minItems: 2, maxItems: 4 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ example: 0, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  correctOptionIndex: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  points: number;

  @ApiProperty({ example: 5, minimum: 0, maximum: 1000 })
  @IsInt()
  @Min(0)
  @Max(1000)
  coins: number;
}
