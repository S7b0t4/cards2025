import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import TelegramBot from 'node-telegram-bot-api';
import { CardProgress } from './card-progress.model';
import { Card } from './card.model';
import { User } from '../users/user.model';

@Injectable()
export class TelegramNotificationsService {
  private readonly logger = new Logger(TelegramNotificationsService.name);
  private bot: TelegramBot | null = null;

  constructor(
    private configService: ConfigService,
    @InjectModel(CardProgress)
    private cardProgressModel: typeof CardProgress,
    @InjectModel(Card)
    private cardModel: typeof Card,
    @InjectModel(User)
    private userModel: typeof User,
  ) {
    this.initializeBot();
  }

  private initializeBot() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured, notifications disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(botToken);
      this.logger.log('Telegram bot initialized for notifications');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
    }
  }

  async sendReviewReminders(): Promise<void> {
    if (!this.bot) {
      this.logger.debug('Bot not initialized, skipping reminders');
      return;
    }

    const now = new Date();
    
    // Find all users who have cards due for review
    const progressRecords = await this.cardProgressModel.findAll({
      where: {
        nextReviewDate: {
          [Op.lte]: now,
        },
      },
    });

    // Get unique user IDs and card IDs
    const userIds = [...new Set(progressRecords.map(p => p.userId))];
    const cardIds = [...new Set(progressRecords.map(p => p.cardId))];

    // Load users and cards separately
    const users = await this.userModel.findAll({
      where: { id: userIds },
    });

    const cards = await this.cardModel.findAll({
      where: { id: cardIds },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const cardMap = new Map(cards.map(c => [c.id, c]));

    // Group by user
    const userCardsMap = new Map<number, { user: User; cards: Card[] }>();

    for (const progress of progressRecords) {
      const user = userMap.get(progress.userId);
      const card = cardMap.get(progress.cardId);

      if (!user?.telegramId || !card) {
        continue;
      }

      const userId = user.id;
      if (!userCardsMap.has(userId)) {
        userCardsMap.set(userId, {
          user,
          cards: [],
        });
      }

      userCardsMap.get(userId)!.cards.push(card);
    }

    // Send messages to each user
    for (const [userId, { user, cards }] of userCardsMap) {
      if (!user.telegramId) continue;

      // Limit to 20 cards per message
      const cardsToReview = cards.slice(0, 20);
      const cardCount = cardsToReview.length;

      try {
        const message = this.buildReminderMessage(cardCount, cards.length);
        await this.bot.sendMessage(user.telegramId, message, {
          parse_mode: 'HTML',
        });
        this.logger.log(`Sent reminder to user ${userId} (${cardCount} cards)`);
      } catch (error: any) {
        // Handle common errors
        if (error.response?.statusCode === 403) {
          this.logger.warn(`User ${userId} blocked the bot`);
        } else {
          this.logger.error(`Failed to send reminder to user ${userId}`, error.message);
        }
      }
    }
  }

  private buildReminderMessage(cardCount: number, totalCount: number): string {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3003';
    const practiceUrl = `${baseUrl}/practice`;

    let message = `📚 <b>Время повторить слова!</b>\n\n`;
    
    if (cardCount < totalCount) {
      message += `У вас есть ${totalCount} карточек для повторения.\n`;
      message += `Сегодня рекомендуется повторить ${cardCount} карточек.\n\n`;
    } else {
      message += `У вас ${cardCount} карточек для повторения.\n\n`;
    }

    message += `Начните практику: <a href="${practiceUrl}">${practiceUrl}</a>`;

    return message;
  }
}

