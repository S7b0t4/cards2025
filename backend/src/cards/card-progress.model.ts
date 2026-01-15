import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { Card } from './card.model';
import { User } from '../users/user.model';

@Table({ 
  tableName: 'card_progress',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'card_id'],
    },
  ],
})
export class CardProgress extends Model<CardProgress> {
  @ApiProperty({ example: 1, description: 'Progress ID' })
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

  @ApiProperty({ example: 1, description: 'Card ID' })
  @ForeignKey(() => Card)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'card_id',
  })
  cardId: number;

  @BelongsTo(() => Card)
  card: Card;

  @ApiProperty({ example: 2.5, description: 'Ease factor for spaced repetition (SM-2 algorithm)' })
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 2.5,
    field: 'ease_factor',
  })
  easeFactor: number;

  @ApiProperty({ example: 0, description: 'Number of repetitions' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'repetitions',
  })
  repetitions: number;

  @ApiProperty({ example: 1, description: 'Interval in days until next review' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'interval_days',
  })
  intervalDays: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Next review date' })
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'next_review_date',
  })
  nextReviewDate: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Last reviewed date', required: false })
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_reviewed_date',
  })
  lastReviewedDate?: Date;

  @ApiProperty({ example: 10, description: 'Total number of correct answers' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'correct_count',
  })
  correctCount: number;

  @ApiProperty({ example: 3, description: 'Total number of incorrect answers' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'incorrect_count',
  })
  incorrectCount: number;

  @ApiProperty({ example: 5, description: 'Consecutive correct answers' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'consecutive_correct',
  })
  consecutiveCorrect: number;

  @ApiProperty({ example: 0, description: 'Consecutive incorrect answers' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'consecutive_incorrect',
  })
  consecutiveIncorrect: number;

  @ApiProperty({ example: 0.75, description: 'Success rate (correct / total)' })
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'success_rate',
  })
  successRate: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}

