import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class AuthCodeDto {
  @ApiProperty({ example: 123456789, description: 'Telegram user ID' })
  @IsNotEmpty()
  @IsNumber()
  telegramId: number;

  @ApiProperty({ example: 'ABC12345', description: 'Authorization code from Telegram bot' })
  @IsNotEmpty()
  @IsString()
  authCode: string;
}







