import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { TaskStatus, TaskPriority } from '../task.model';

export class CreateTaskDto {
  @ApiProperty({ example: 1, description: 'Task Group ID' })
  @IsInt()
  @Min(1)
  taskGroupId: number;

  @ApiProperty({ example: 'Изучить TypeScript', description: 'Task name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Прочитать документацию и сделать примеры', description: 'Task description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'todo', description: 'Task status', enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 'medium', description: 'Task priority', enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ example: '2024-12-25T00:00:00.000Z', description: 'Due date', required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: 1, description: 'Order/position in group', required: false })
  @IsInt()
  @IsOptional()
  order?: number;
}
































