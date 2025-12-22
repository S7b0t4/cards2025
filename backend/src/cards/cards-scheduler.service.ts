import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramNotificationsService } from './telegram-notifications.service';

@Injectable()
export class CardsSchedulerService {
  private readonly logger = new Logger(CardsSchedulerService.name);

  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleReviewReminders() {
    this.logger.log('Running scheduled review reminders');
    try {
      await this.telegramNotificationsService.sendReviewReminders();
    } catch (error) {
      this.logger.error('Error in scheduled review reminders', error);
    }
  }
}


