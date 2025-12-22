import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/user.model';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { TelegramOAuthDto } from './dto/telegram-oauth.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async validateTelegramAuth(authData: TelegramOAuthDto): Promise<User> {
    // Verify hash
    // Временно отключаем проверку хеша для отладки, если домен не настроен
    const skipHashCheck = this.configService.get<string>('SKIP_TELEGRAM_HASH_CHECK', 'false') === 'true';
    
    if (!skipHashCheck) {
      const isValid = this.verifyTelegramAuth(authData);
      if (!isValid) {
        console.warn('[TELEGRAM AUTH] Hash verification failed. If domain is not set in BotFather, set SKIP_TELEGRAM_HASH_CHECK=true temporarily.');
        throw new UnauthorizedException('Invalid Telegram authentication data');
      }
    } else {
      console.warn('[TELEGRAM AUTH] Hash verification skipped (SKIP_TELEGRAM_HASH_CHECK=true)');
    }

    // Check auth_date (should be within 5 minutes)
    const authDate = new Date(authData.auth_date * 1000);
    const now = new Date();
    const diffMinutes = (now.getTime() - authDate.getTime()) / 1000 / 60;
    
    if (diffMinutes > 5) {
      throw new UnauthorizedException('Authentication data expired');
    }

    // Find or create user
    let user = await this.usersService.findByTelegramId(authData.id);

    const name = [authData.first_name, authData.last_name]
      .filter(Boolean)
      .join(' ') || authData.username || `User ${authData.id}`;

    if (!user) {
      user = await this.userModel.create({
        name,
        email: `telegram_${authData.id}@telegram.local`,
        telegramId: authData.id,
      });
    } else {
      await user.update({ name });
    }

    return user;
  }

  private verifyTelegramAuth(authData: TelegramOAuthDto): boolean {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram bot token not configured');
    }

    // Create data check string
    // Filter out hash and undefined/null values, then sort and format
    // All values must be converted to strings (especially auth_date)
    const dataCheckString = Object.keys(authData)
      .filter(key => {
        // Exclude hash and undefined/null values
        return key !== 'hash' && authData[key] !== undefined && authData[key] !== null;
      })
      .sort()
      .map(key => {
        const value = authData[key as keyof TelegramOAuthDto];
        // Convert all values to strings (important for auth_date)
        return `${key}=${String(value)}`;
      })
      .join('\n');

    // Create secret key from bot token
    // HMAC-SHA256 with 'WebAppData' as key, bot token as message
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    // HMAC-SHA256 with secretKey as key, dataCheckString as message
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Debug logging
    console.log('[TELEGRAM AUTH DEBUG]', {
      dataCheckString,
      receivedHash: authData.hash,
      calculatedHash,
      match: calculatedHash === authData.hash,
      botTokenPrefix: botToken.substring(0, 10) + '...',
    });

    // Compare hashes (case-sensitive)
    return calculatedHash === authData.hash;
  }

  async login(user: User) {
    const payload = { sub: user.id, telegramId: user.telegramId };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        telegramId: user.telegramId,
      },
    };
  }

  async devLogin(): Promise<User> {
    // Check if dev login is enabled via environment variable
    const enableDevLogin = this.configService.get<string>('ENABLE_DEV_LOGIN', 'false');
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    
    // Allow dev login if:
    // 1. ENABLE_DEV_LOGIN is set to 'true', OR
    // 2. NODE_ENV is not 'production'
    if (nodeEnv === 'production' && enableDevLogin !== 'true') {
      throw new UnauthorizedException('Dev login is not available in production');
    }

    // Find or create test user
    let user = await this.usersService.findByTelegramId(999999999);
    
    if (!user) {
      user = await this.userModel.create({
        name: 'Тестовый аккаунт',
        email: 'test@sybota.space',
        telegramId: 999999999,
      });
    } else {
      // Update name if it's still "Dev User"
      if (user.name === 'Dev User') {
        await user.update({ name: 'Тестовый аккаунт' });
      }
    }

    return user;
  }
}
