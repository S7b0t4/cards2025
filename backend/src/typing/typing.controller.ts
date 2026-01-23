import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TypingService } from './typing.service';
import { CreateTypingTestResultDto } from './dto/create-typing-test-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('typing')
@Controller('typing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TypingController {
  constructor(private readonly typingService: TypingService) {}

  @Post('results')
  @ApiOperation({ summary: 'Create typing test result' })
  @ApiResponse({ status: 201, description: 'Test result created successfully' })
  async create(@Request() req, @Body() createDto: CreateTypingTestResultDto) {
    return this.typingService.create(req.user.id, createDto);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get all typing test results for current user' })
  @ApiResponse({ status: 200, description: 'List of test results' })
  async findAll(@Request() req) {
    return this.typingService.findAllByUser(req.user.id);
  }

  @Get('results/:id')
  @ApiOperation({ summary: 'Get typing test result by ID' })
  @ApiResponse({ status: 200, description: 'Test result' })
  @ApiResponse({ status: 404, description: 'Test result not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.typingService.findOne(+id, req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get typing statistics for current user' })
  @ApiResponse({ status: 200, description: 'Typing statistics' })
  async getStats(@Request() req) {
    return this.typingService.getStats(req.user.id);
  }
}
