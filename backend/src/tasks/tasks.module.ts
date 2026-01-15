import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskGroup } from './task-group.model';
import { Task } from './task.model';
import { TasksTelegramBotService } from './telegram-bot.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([TaskGroup, Task, User]),
    UsersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksTelegramBotService],
  exports: [TasksService],
})
export class TasksModule {}

