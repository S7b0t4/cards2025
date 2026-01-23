import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TypingController } from './typing.controller';
import { TypingService } from './typing.service';
import { TypingTestResult } from './typing-test-result.model';

@Module({
  imports: [SequelizeModule.forFeature([TypingTestResult])],
  controllers: [TypingController],
  providers: [TypingService],
  exports: [TypingService],
})
export class TypingModule {}
