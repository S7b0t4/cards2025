import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCardDto {
  @ApiProperty({ example: 'Кот', description: 'Russian word', required: false })
  @IsOptional()
  @IsString()
  russianWord?: string;

  @ApiProperty({ example: 'Cat', description: 'English word', required: false })
  @IsOptional()
  @IsString()
  englishWord?: string;

  @ApiProperty({ example: 'Домашнее животное из семейства кошачьих', description: 'Russian description', required: false })
  @IsOptional()
  @IsString()
  russianDescription?: string;

  @ApiProperty({ example: 'A domestic animal from the cat family', description: 'English description', required: false })
  @IsOptional()
  @IsString()
  englishDescription?: string;
}


