import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Card } from './card.model';
import { CardProgress } from './card-progress.model';
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
    });

    return card;
  }

  async findAll(userId: number): Promise<Card[]> {
    return this.cardModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
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
  async getCardsForReview(userId: number, limit: number = 20): Promise<Card[]> {
    const now = new Date();
    
    const progressRecords = await this.cardProgressModel.findAll({
      where: {
        userId,
        nextReviewDate: {
          [Op.lte]: now,
        },
      },
      order: [['nextReviewDate', 'ASC']],
      limit: Math.min(limit, 20), // Max 20 cards
    });

    const cardIds = progressRecords.map(progress => progress.cardId);
    
    const cards = await this.cardModel.findAll({
      where: {
        id: cardIds,
        userId,
      },
    });

    // Sort cards to match the order of progress records
    const cardMap = new Map(cards.map(card => [card.id, card]));
    return progressRecords
      .map(progress => cardMap.get(progress.cardId))
      .filter((card): card is Card => card !== undefined);
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
      });
    }

    // SM-2 Algorithm
    if (quality >= 3) {
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
    progress.easeFactor = Math.max(
      1.3,
      progress.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + progress.intervalDays);
    progress.nextReviewDate = nextReview;
    progress.lastReviewedDate = new Date();

    await progress.save();

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

    return {
      totalCards,
      dueCards,
      recentlyReviewed,
      activeDays,
    };
  }
}

