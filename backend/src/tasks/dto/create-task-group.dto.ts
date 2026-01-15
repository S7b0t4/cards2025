import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTaskGroupDto {
  @ApiProperty({ example: 'Работа', description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Задачи связанные с работой', description: 'Group description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#FF5733', description: 'Group color', required: false })
  @IsString()
  @IsOptional()
  color?: string;
}
































