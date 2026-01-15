import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { TaskGroup } from './task-group.model';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Table({ tableName: 'tasks' })
export class Task extends Model<Task> {
  @ApiProperty({ example: 1, description: 'Task ID' })
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ApiProperty({ example: 1, description: 'Task Group ID' })
  @ForeignKey(() => TaskGroup)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'task_group_id',
  })
  taskGroupId: number;

  @BelongsTo(() => TaskGroup)
  taskGroup: TaskGroup;

  @ApiProperty({ example: 'Изучить TypeScript', description: 'Task name' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'name',
  })
  name: string;

  @ApiProperty({ example: 'Прочитать документацию и сделать примеры', description: 'Task description', required: false })
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'description',
  })
  description?: string;

  @ApiProperty({ example: 'todo', description: 'Task status', enum: TaskStatus, default: TaskStatus.TODO })
  @Column({
    type: DataType.ENUM(...Object.values(TaskStatus)),
    allowNull: false,
    defaultValue: TaskStatus.TODO,
    field: 'status',
  })
  status: TaskStatus;

  @ApiProperty({ example: 'medium', description: 'Task priority', enum: TaskPriority, default: TaskPriority.MEDIUM })
  @Column({
    type: DataType.ENUM(...Object.values(TaskPriority)),
    allowNull: false,
    defaultValue: TaskPriority.MEDIUM,
    field: 'priority',
  })
  priority: TaskPriority;

  @ApiProperty({ example: '2024-12-25T00:00:00.000Z', description: 'Due date', required: false })
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'due_date',
  })
  dueDate?: Date;

  @ApiProperty({ example: 1, description: 'Order/position in group', required: false })
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'order',
  })
  order?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}
































