import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { ReviewCardDto } from './dto/review-card.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  private readonly logger = new Logger(CardsController.name);

  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  create(@Request() req: any, @Body() createCardDto: CreateCardDto) {
    this.logger.log(`POST /cards - User ID: ${req.user?.id}, Body: ${JSON.stringify(createCardDto)}`);
    try {
      return this.cardsService.create(req.user.id, createCardDto);
    } catch (error) {
      this.logger.error(`POST /cards - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all user cards' })
  @ApiResponse({ status: 200, description: 'Returns all cards for the user' })
  findAll(
    @Request() req: any,
    @Query('group') group?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    this.logger.log(`GET /cards - User ID: ${req.user?.id}, Group: ${group || 'all'}, Limit: ${limitNum || 'all'}, Offset: ${offsetNum || 0}`);
    try {
      return this.cardsService.findAll(req.user.id, group, limitNum, offsetNum);
    } catch (error) {
      this.logger.error(`GET /cards - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('review')
  @ApiOperation({ summary: 'Get cards for review' })
  @ApiResponse({ status: 200, description: 'Returns cards that are due for review' })
  getCardsForReview(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    this.logger.log(`GET /cards/review - User ID: ${req.user?.id}, Limit: ${limitNum}`);
    try {
      return this.cardsService.getCardsForReview(req.user.id, limitNum);
    } catch (error) {
      this.logger.error(`GET /cards/review - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent cards (last created)' })
  @ApiResponse({ status: 200, description: 'Returns recent cards ordered by creation date' })
  getRecentCards(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    this.logger.log(`GET /cards/recent - User ID: ${req.user?.id}, Limit: ${limitNum || 'all'}`);
    try {
      return this.cardsService.getRecentCards(req.user.id, limitNum);
    } catch (error) {
      this.logger.error(`GET /cards/recent - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get card statistics' })
  @ApiResponse({ status: 200, description: 'Returns card statistics' })
  getStatistics(@Request() req: any) {
    return this.cardsService.getStatistics(req.user.id);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all card groups for user' })
  @ApiResponse({ status: 200, description: 'Returns list of group names' })
  getGroups(@Request() req: any) {
    this.logger.log(`GET /cards/groups - User ID: ${req.user?.id}`);
    try {
      return this.cardsService.getGroups(req.user.id);
    } catch (error) {
      this.logger.error(`GET /cards/groups - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID' })
  @ApiResponse({ status: 200, description: 'Returns card information' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.cardsService.findOne(req.user.id, +id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update card' })
  @ApiResponse({ status: 200, description: 'Card updated successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardsService.update(req.user.id, +id, updateCardDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete card' })
  @ApiResponse({ status: 204, description: 'Card deleted successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.cardsService.remove(req.user.id, +id);
  }

  @Post('review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a card (update progress)' })
  @ApiResponse({ status: 200, description: 'Card reviewed successfully' })
  reviewCard(@Request() req: any, @Body() reviewCardDto: ReviewCardDto) {
    this.logger.log(`POST /cards/review - User ID: ${req.user?.id}, Body: ${JSON.stringify(reviewCardDto)}`);
    try {
      return this.cardsService.reviewCard(req.user.id, reviewCardDto);
    } catch (error) {
      this.logger.error(`POST /cards/review - Error: ${error.message}`, error.stack);
      throw error;
    }
  }
}

