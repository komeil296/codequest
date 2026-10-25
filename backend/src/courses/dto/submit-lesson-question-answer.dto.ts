import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitLessonQuestionAnswerDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedOptionIndex: number;
}
