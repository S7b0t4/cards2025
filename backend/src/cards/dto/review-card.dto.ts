import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ReviewCardDto {
  @ApiProperty({ example: 1, description: 'Card ID' })
  @IsNotEmpty()
  @IsNumber()
  cardId: number;

  @ApiProperty({ 
    example: 3, 
    description: 'Quality of recall (0-5): 0=total blackout, 5=perfect response',
    enum: [0, 1, 2, 3, 4, 5]
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(5)
  quality: number;
}


