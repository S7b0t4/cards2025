import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TelegramOAuthDto } from './dto/telegram-oauth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Telegram OAuth' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Telegram authentication' })
  async login(@Body() telegramAuth: TelegramOAuthDto) {
    const user = await this.authService.validateTelegramAuth(telegramAuth);
    return this.authService.login(user);
  }

  @Post('dev')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dev login (only in development mode)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async devLogin() {
    const user = await this.authService.devLogin();
    return this.authService.login(user);
  }
}
