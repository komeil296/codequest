import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class CreateStudentForInstitutionDto extends CreateStudentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the institution the student belongs to',
    format: 'uuid',
  })
  @IsUUID()
  institutionId: string;
}
