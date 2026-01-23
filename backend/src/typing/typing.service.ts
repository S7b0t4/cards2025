import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TypingTestResult } from './typing-test-result.model';
import { CreateTypingTestResultDto } from './dto/create-typing-test-result.dto';

@Injectable()
export class TypingService {
  constructor(
    @InjectModel(TypingTestResult)
    private typingTestResultModel: typeof TypingTestResult,
  ) {}

  async create(userId: number, createDto: CreateTypingTestResultDto): Promise<TypingTestResult> {
    return this.typingTestResultModel.create({
      userId,
      ...createDto,
    });
  }

  async findAllByUser(userId: number): Promise<TypingTestResult[]> {
    return this.typingTestResultModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number, userId: number): Promise<TypingTestResult> {
    const result = await this.typingTestResultModel.findOne({
      where: { id, userId },
    });

    if (!result) {
      throw new NotFoundException('Typing test result not found');
    }

    return result;
  }

  async getStats(userId: number) {
    const results = await this.findAllByUser(userId);
    
    if (results.length === 0) {
      return {
        totalTests: 0,
        averageWpm: 0,
        averageAccuracy: 0,
        bestWpm: 0,
        bestAccuracy: 0,
        totalWords: 0,
        totalTime: 0,
      };
    }

    const totalTests = results.length;
    const averageWpm = results.reduce((sum, r) => sum + Number(r.wpm), 0) / totalTests;
    const averageAccuracy = results.reduce((sum, r) => sum + Number(r.accuracy), 0) / totalTests;
    const bestWpm = Math.max(...results.map(r => Number(r.wpm)));
    const bestAccuracy = Math.max(...results.map(r => Number(r.accuracy)));
    const totalWords = results.reduce((sum, r) => sum + r.totalWords, 0);
    const totalTime = results.reduce((sum, r) => sum + r.time, 0);

    return {
      totalTests,
      averageWpm: Math.round(averageWpm * 10) / 10,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      bestWpm: Math.round(bestWpm * 10) / 10,
      bestAccuracy: Math.round(bestAccuracy * 10) / 10,
      totalWords,
      totalTime,
    };
  }
}
