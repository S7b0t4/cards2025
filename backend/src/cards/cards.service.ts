import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Card } from './card.model';
import { CardProgress } from './card-progress.model';
import { User } from '../users/user.model';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { ReviewCardDto } from './dto/review-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectModel(Card)
    private cardModel: typeof Card,
    @InjectModel(CardProgress)
    private cardProgressModel: typeof CardProgress,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async create(userId: number, createCardDto: CreateCardDto): Promise<Card> {
    const card = await this.cardModel.create({
      ...createCardDto,
      userId,
    });

    // Create initial progress for the card
    await this.cardProgressModel.create({
      userId,
      cardId: card.id,
      easeFactor: 2.5,
      repetitions: 0,
      intervalDays: 1,
      nextReviewDate: new Date(),
      correctCount: 0,
      incorrectCount: 0,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      successRate: 0,
    });

    return card;
  }

  async findAll(userId: number, groupName?: string): Promise<Card[]> {
    const where: any = { userId };
    
    // Filter by group if specified
    if (groupName) {
      where.groupName = groupName;
    }
    
    return this.cardModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  // Get all unique group names for a user
  async getGroups(userId: number): Promise<string[]> {
    const cards = await this.cardModel.findAll({
      where: { userId },
      attributes: ['groupName'],
      raw: true,
    });
    
    const groups = [...new Set(cards.map((card: any) => card.groupName || 'Мои карточки'))];
    return groups.sort();
  }

  async findOne(userId: number, id: number): Promise<Card> {
    const card = await this.cardModel.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    return card;
  }

  async update(userId: number, id: number, updateCardDto: UpdateCardDto): Promise<Card> {
    const card = await this.findOne(userId, id);
    await card.update(updateCardDto);
    return card;
  }

  async remove(userId: number, id: number): Promise<void> {
    const card = await this.findOne(userId, id);
    
    // Delete progress records for this card
    await this.cardProgressModel.destroy({
      where: { cardId: id, userId },
    });

    await card.destroy();
  }

  // Get cards for review (due cards)
  // Prioritizes cards with poor performance (low success rate, high incorrect count)
  async getCardsForReview(userId: number, limit: number = 20): Promise<Card[]> {
    const now = new Date();
    
    // Get all due cards
    const progressRecords = await this.cardProgressModel.findAll({
      where: {
        userId,
        nextReviewDate: {
          [Op.lte]: now,
        },
      },
      include: [{
        model: Card,
        as: 'card',
        required: true,
      }],
    });

    if (progressRecords.length === 0) {
      return [];
    }

    // Calculate priority score for each card
    // Higher score = higher priority (should be shown more often)
    const cardsWithPriority = progressRecords.map(progress => {
      const totalAnswers = progress.correctCount + progress.incorrectCount;
      
      // Base priority factors:
      // 1. Low success rate (0-1 scale, inverted so low = high priority)
      const successRatePriority = totalAnswers > 0 ? (1 - progress.successRate) * 3 : 2;
      
      // 2. High incorrect count (normalized)
      const incorrectPriority = Math.min(progress.incorrectCount / 5, 1) * 2;
      
      // 3. Consecutive incorrect answers (recent mistakes are important)
      const consecutiveIncorrectPriority = Math.min(progress.consecutiveIncorrect / 3, 1) * 2;
      
      // 4. Overdue time (how long overdue, in days)
      const overdueDays = Math.max(0, Math.floor((now.getTime() - progress.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)));
      const overduePriority = Math.min(overdueDays / 7, 1) * 1;
      
      // 5. Low ease factor (harder cards need more practice)
      const easeFactorPriority = (2.5 - progress.easeFactor) / 1.2;
      
      // Total priority score
      const priority = 
        successRatePriority + 
        incorrectPriority + 
        consecutiveIncorrectPriority + 
        overduePriority + 
        easeFactorPriority;
      
      return {
        progress,
        card: (progress as any).card,
        priority,
      };
    });

    // Sort by priority (highest first), then by nextReviewDate (oldest first)
    cardsWithPriority.sort((a, b) => {
      if (Math.abs(a.priority - b.priority) > 0.1) {
        return b.priority - a.priority; // Higher priority first
      }
      // If priorities are similar, use review date
      return a.progress.nextReviewDate.getTime() - b.progress.nextReviewDate.getTime();
    });

    // Take top N cards
    const topCards = cardsWithPriority.slice(0, Math.min(limit, 20));
    
    return topCards.map(item => item.card);
  }

  // Get recent cards (last created cards)
  async getRecentCards(userId: number, limit?: number): Promise<Card[]> {
    const cards = await this.cardModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: limit ? Math.min(limit, 100) : undefined, // Max 100 if limit specified
    });

    return cards;
  }

  // Review a card (update progress using SM-2 algorithm)
  async reviewCard(userId: number, reviewCardDto: ReviewCardDto): Promise<CardProgress> {
    const { cardId, quality } = reviewCardDto;

    // Verify card belongs to user
    await this.findOne(userId, cardId);

    let progress = await this.cardProgressModel.findOne({
      where: { userId, cardId },
    });

    if (!progress) {
      // Create progress if it doesn't exist
      progress = await this.cardProgressModel.create({
        userId,
        cardId,
        easeFactor: 2.5,
        repetitions: 0,
        intervalDays: 1,
        nextReviewDate: new Date(),
        correctCount: 0,
        incorrectCount: 0,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        successRate: 0,
      });
    }

    // Track answer statistics
    const isCorrect = quality >= 3;
    
    if (isCorrect) {
      progress.correctCount += 1;
      progress.consecutiveCorrect += 1;
      progress.consecutiveIncorrect = 0; // Reset incorrect streak
    } else {
      progress.incorrectCount += 1;
      progress.consecutiveIncorrect += 1;
      progress.consecutiveCorrect = 0; // Reset correct streak
    }

    // Calculate success rate
    const totalAnswers = progress.correctCount + progress.incorrectCount;
    progress.successRate = totalAnswers > 0 ? progress.correctCount / totalAnswers : 0;

    // SM-2 Algorithm
    if (isCorrect) {
      // Correct response
      if (progress.repetitions === 0) {
        progress.intervalDays = 1;
      } else if (progress.repetitions === 1) {
        progress.intervalDays = 6;
      } else {
        progress.intervalDays = Math.round(progress.intervalDays * progress.easeFactor);
      }

      progress.repetitions += 1;
    } else {
      // Incorrect response - reset
      progress.repetitions = 0;
      progress.intervalDays = 1;
    }

    // Update ease factor (bounded between 1.3 and 2.5)
    // Penalize more for incorrect answers
    const easeFactorChange = isCorrect
      ? (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      : -0.2; // Larger penalty for incorrect answers
    
    progress.easeFactor = Math.max(
      1.3,
      Math.min(2.5, progress.easeFactor + easeFactorChange)
    );

    // Calculate next review date
    // Cards with poor performance get shorter intervals
    let adjustedInterval = progress.intervalDays;
    if (progress.successRate < 0.5 && totalAnswers >= 3) {
      // If success rate is below 50% and we have enough data, reduce interval
      adjustedInterval = Math.max(1, Math.floor(progress.intervalDays * 0.7));
    } else if (progress.successRate > 0.8 && totalAnswers >= 5) {
      // If success rate is above 80%, increase interval slightly
      adjustedInterval = Math.floor(progress.intervalDays * 1.1);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + adjustedInterval);
    progress.nextReviewDate = nextReview;
    progress.lastReviewedDate = new Date();

    await progress.save();

    // Award points for correct answers
    if (isCorrect) {
      let pointsAwarded = 10; // Base points for correct answer
      
      // Bonus points for consecutive correct answers
      if (progress.consecutiveCorrect >= 5) {
        pointsAwarded += 5; // Bonus for 5+ consecutive
      }
      if (progress.consecutiveCorrect >= 10) {
        pointsAwarded += 10; // Extra bonus for 10+ consecutive
      }
      
      // Bonus for high quality answers
      if (quality === 5) {
        pointsAwarded += 5; // Perfect answer bonus
      }
      
      // Update user points
      await this.userModel.increment('points', {
        by: pointsAwarded,
        where: { id: userId },
      });
    }

    return progress;
  }

  // Get statistics for user
  async getStatistics(userId: number) {
    const totalCards = await this.cardModel.count({ where: { userId } });
    
    const now = new Date();
    const dueCards = await this.cardProgressModel.count({
      where: {
        userId,
        nextReviewDate: {
          [Op.lte]: now,
        },
      },
    });

    const recentlyReviewed = await this.cardProgressModel.count({
      where: {
        userId,
        lastReviewedDate: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // Calculate active days (unique dates when user reviewed cards)
    const progressRecords = await this.cardProgressModel.findAll({
      where: {
        userId,
        lastReviewedDate: {
          [Op.not]: null,
        },
      },
      attributes: ['lastReviewedDate'],
      raw: true,
    });

    // Get unique dates (YYYY-MM-DD format)
    const uniqueDates = new Set(
      progressRecords
        .map((record: any) => {
          if (!record.lastReviewedDate) return null;
          const date = new Date(record.lastReviewedDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })
        .filter(Boolean)
    );

    const activeDays = uniqueDates.size;

    // Get user points
    const user = await this.userModel.findByPk(userId);
    const points = user?.points || 0;

    return {
      totalCards,
      dueCards,
      recentlyReviewed,
      activeDays,
      points,
    };
  }
}

















