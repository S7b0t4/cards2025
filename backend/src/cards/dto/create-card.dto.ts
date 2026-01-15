import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ example: 'Кот', description: 'Russian word' })
  @IsNotEmpty()
  @IsString()
  russianWord: string;

  @ApiProperty({ example: 'Cat', description: 'English word' })
  @IsNotEmpty()
  @IsString()
  englishWord: string;

  @ApiProperty({ example: 'Домашнее животное из семейства кошачьих', description: 'Russian description', required: false })
  @IsOptional()
  @IsString()
  russianDescription?: string;

  @ApiProperty({ example: 'A domestic animal from the cat family', description: 'English description', required: false })
  @IsOptional()
  @IsString()
  englishDescription?: string;

  @ApiProperty({ example: 'Мои карточки', description: 'Card group name', required: false })
  @IsOptional()
  @IsString()
  groupName?: string;
}


