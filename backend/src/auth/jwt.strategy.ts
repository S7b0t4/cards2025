import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    this.logger.log(`Validating JWT token for user ID: ${payload.sub}`);
    try {
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        this.logger.warn(`User not found for ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }
      this.logger.log(`User validated successfully: ${user.id} (${user.name})`);
      return user;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw error;
    }
  }
}


