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
import { User } from '../users/user.model';

@Table({ tableName: 'typing_test_results' })
export class TypingTestResult extends Model<TypingTestResult> {
  @ApiProperty({ example: 1, description: 'Test result ID' })
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

  @ApiProperty({ example: 45.5, description: 'Words per minute' })
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    field: 'wpm',
  })
  wpm: number;

  @ApiProperty({ example: 95.5, description: 'Accuracy percentage' })
  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    field: 'accuracy',
  })
  accuracy: number;

  @ApiProperty({ example: 30, description: 'Time in seconds' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'time',
  })
  time: number;

  @ApiProperty({ example: 45, description: 'Correct words count' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'correct_words',
  })
  correctWords: number;

  @ApiProperty({ example: 5, description: 'Incorrect words count' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'incorrect_words',
  })
  incorrectWords: number;

  @ApiProperty({ example: 50, description: 'Total words count' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'total_words',
  })
  totalWords: number;

  @ApiProperty({ example: 'words', description: 'Test mode: words or time' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'mode',
  })
  mode: string;

  @ApiProperty({ example: 50, description: 'Target words (for words mode)' })
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'target_words',
  })
  targetWords?: number;

  @ApiProperty({ example: 30, description: 'Target time in seconds (for time mode)' })
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'target_time',
  })
  targetTime?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}
