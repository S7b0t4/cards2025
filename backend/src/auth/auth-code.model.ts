import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from '../users/user.model';

@Table({ tableName: 'auth_codes' })
export class AuthCode extends Model<AuthCode> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    field: 'code',
  })
  code: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  expiresAt: Date;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;
}







