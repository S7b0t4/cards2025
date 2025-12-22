import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Card } from './card.model';
import { CardProgress } from './card-progress.model';
import { TelegramNotificationsService } from './telegram-notifications.service';
import { CardsSchedulerService } from './cards-scheduler.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Card, CardProgress, User]),
    UsersModule,
  ],
  controllers: [CardsController],
  providers: [CardsService, TelegramNotificationsService, CardsSchedulerService],
  exports: [CardsService],
})
export class CardsModule {}

