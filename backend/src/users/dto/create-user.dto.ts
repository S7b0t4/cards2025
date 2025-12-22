import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}


