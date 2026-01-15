import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @ApiProperty({ example: 1, description: 'User ID' })
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @ApiProperty({ example: '123456789', description: 'Telegram user ID', required: false })
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    unique: true,
    field: 'telegram_id',
  })
  telegramId?: number;

  @ApiProperty({ example: 150, description: 'User points/score' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  points: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}


