import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateTypingTestResultDto {
  @ApiProperty({ example: 45.5, description: 'Words per minute' })
  @IsNumber()
  @Min(0)
  wpm: number;

  @ApiProperty({ example: 95.5, description: 'Accuracy percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy: number;

  @ApiProperty({ example: 30, description: 'Time in seconds' })
  @IsNumber()
  @Min(0)
  time: number;

  @ApiProperty({ example: 45, description: 'Correct words count' })
  @IsNumber()
  @Min(0)
  correctWords: number;

  @ApiProperty({ example: 5, description: 'Incorrect words count' })
  @IsNumber()
  @Min(0)
  incorrectWords: number;

  @ApiProperty({ example: 50, description: 'Total words count' })
  @IsNumber()
  @Min(0)
  totalWords: number;

  @ApiProperty({ example: 'words', description: 'Test mode: words or time' })
  @IsString()
  mode: string;

  @ApiProperty({ example: 50, description: 'Target words (for words mode)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetWords?: number;

  @ApiProperty({ example: 30, description: 'Target time in seconds (for time mode)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetTime?: number;
}
