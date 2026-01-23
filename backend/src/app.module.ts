import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { TasksModule } from './tasks/tasks.module';
import { TypingModule } from './typing/typing.module';
import { DatabaseConfig } from './config/database.config';
// Импортируем все модели для явной регистрации
import { User } from './users/user.model';
import { Card } from './cards/card.model';
import { CardProgress } from './cards/card-progress.model';
import { TaskGroup } from './tasks/task-group.model';
import { Task } from './tasks/task.model';
import { AuthCode } from './auth/auth-code.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useClass: DatabaseConfig,
    }),
    // Явно регистрируем все модели, чтобы они синхронизировались
    SequelizeModule.forFeature([
      User,
      Card,
      CardProgress,
      TaskGroup,
      Task,
      AuthCode,
    ]),
    UsersModule,
    AuthModule,
    CardsModule,
    TasksModule,
    TypingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

