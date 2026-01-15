import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.model';
import { Task } from './task.model';

@Table({ tableName: 'task_groups' })
export class TaskGroup extends Model<TaskGroup> {
  @ApiProperty({ example: 1, description: 'Task Group ID' })
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ApiProperty({ example: 'Работа', description: 'Group name' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'name',
  })
  name: string;

  @ApiProperty({ example: 'Задачи связанные с работой', description: 'Group description', required: false })
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'description',
  })
  description?: string;

  @ApiProperty({ example: '#FF5733', description: 'Group color', required: false })
  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'color',
  })
  color?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;

  @HasMany(() => Task)
  tasks: Task[];
}

