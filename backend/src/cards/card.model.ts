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

@Table({ tableName: 'cards' })
export class Card extends Model<Card> {
  @ApiProperty({ example: 1, description: 'Card ID' })
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

  @ApiProperty({ example: 'Кот', description: 'Russian word' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'russian_word',
  })
  russianWord: string;

  @ApiProperty({ example: 'Cat', description: 'English word' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'english_word',
  })
  englishWord: string;

  @ApiProperty({ example: 'Домашнее животное из семейства кошачьих', description: 'Russian description', required: false })
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'russian_description',
  })
  russianDescription?: string;

  @ApiProperty({ example: 'A domestic animal from the cat family', description: 'English description', required: false })
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'english_description',
  })
  englishDescription?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Created at' })
  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Updated at' })
  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}


