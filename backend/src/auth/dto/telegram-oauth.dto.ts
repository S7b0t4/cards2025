import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class TelegramOAuthDto {
  @ApiProperty({ example: 123456789, description: 'Telegram user ID' })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'John', description: 'First name', required: false })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ example: 'johndoe', description: 'Username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'https://t.me/i/userpic/...', description: 'Photo URL', required: false })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiProperty({ example: 1234567890, description: 'Auth date (Unix timestamp)' })
  @IsNotEmpty()
  @IsNumber()
  auth_date: number;

  @ApiProperty({ example: 'abc123def456...', description: 'Hash for verification' })
  @IsNotEmpty()
  @IsString()
  hash: string;
}





