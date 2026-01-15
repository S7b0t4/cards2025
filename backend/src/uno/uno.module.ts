import { Module } from '@nestjs/common';
import { UnoGameService } from './uno-game.service';
import { UnoBotService } from './uno-bot.service';

@Module({
  providers: [UnoGameService, UnoBotService],
  exports: [UnoGameService],
})
export class UnoModule {}



