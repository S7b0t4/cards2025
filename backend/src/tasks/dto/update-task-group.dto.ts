import { PartialType } from '@nestjs/swagger';
import { CreateTaskGroupDto } from './create-task-group.dto';

export class UpdateTaskGroupDto extends PartialType(CreateTaskGroupDto) {}
































