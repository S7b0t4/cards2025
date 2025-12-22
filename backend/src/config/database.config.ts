import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions, SequelizeOptionsFactory } from '@nestjs/sequelize';

@Injectable()
export class DatabaseConfig implements SequelizeOptionsFactory {
  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  createSequelizeOptions(): SequelizeModuleOptions {
    return {
      dialect: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_NAME', 'mydb'),
      autoLoadModels: true,
      synchronize: this.configService.get<string>('NODE_ENV') !== 'production',
      logging: this.configService.get<string>('NODE_ENV') === 'development',
    };
  }
}

