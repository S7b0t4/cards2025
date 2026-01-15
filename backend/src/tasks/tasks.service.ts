import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TaskGroup } from './task-group.model';
import { Task } from './task.model';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskGroupDto } from './dto/update-task-group.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(TaskGroup)
    private taskGroupModel: typeof TaskGroup,
    @InjectModel(Task)
    private taskModel: typeof Task,
  ) {}

  async create(userId: number, createDto: CreateTaskGroupDto): Promise<TaskGroup> {
    return this.taskGroupModel.create({
      ...createDto,
      userId,
    });
  }

  async findAll(userId: number): Promise<TaskGroup[]> {
    return this.taskGroupModel.findAll({
      where: { userId },
      include: [Task],
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number, userId: number): Promise<TaskGroup> {
    const group = await this.taskGroupModel.findOne({
      where: { id, userId },
      include: [
        {
          model: Task,
          required: false,
        },
      ],
    });

    if (!group) {
      throw new NotFoundException(`Task group with ID ${id} not found`);
    }

    // Ensure tasks are loaded and sorted
    if (!group.tasks) {
      group.tasks = [];
    } else {
      // Sort tasks manually
      group.tasks.sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }

    return group;
  }

  async update(id: number, userId: number, updateDto: UpdateTaskGroupDto): Promise<TaskGroup> {
    const group = await this.findOne(id, userId);
    
    await group.update(updateDto);
    return group.reload();
  }

  async remove(id: number, userId: number): Promise<void> {
    const group = await this.findOne(id, userId);
    await group.destroy();
  }

  async findByTelegramId(telegramId: number): Promise<TaskGroup[]> {
    const { User } = await import('../users/user.model');
    return this.taskGroupModel.findAll({
      include: [
        {
          model: User,
          where: { telegramId },
          attributes: [],
        },
        Task,
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  // Task methods
  async createTask(userId: number, createDto: CreateTaskDto): Promise<Task> {
    // Verify that the task group belongs to the user
    const group = await this.findOne(createDto.taskGroupId, userId);
    
    const taskData: any = {
      ...createDto,
      taskGroupId: group.id,
    };
    
    // Convert dueDate string to Date if provided
    if (taskData.dueDate && typeof taskData.dueDate === 'string') {
      taskData.dueDate = new Date(taskData.dueDate);
    }
    
    return this.taskModel.create(taskData);
  }

  async findAllTasks(groupId: number, userId: number): Promise<Task[]> {
    // Verify that the task group belongs to the user
    await this.findOne(groupId, userId);
    
    return this.taskModel.findAll({
      where: { taskGroupId: groupId },
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
    });
  }

  async findOneTask(taskId: number, userId: number): Promise<Task> {
    const task = await this.taskModel.findOne({
      where: { id: taskId },
      include: [TaskGroup],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Verify that the task group belongs to the user
    if (task.taskGroup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return task;
  }

  async updateTask(taskId: number, userId: number, updateDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOneTask(taskId, userId);
    
    const updateData: any = { ...updateDto };
    
    // Convert dueDate string to Date if provided
    if (updateData.dueDate && typeof updateData.dueDate === 'string') {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    
    await task.update(updateData);
    return task.reload();
  }

  async removeTask(taskId: number, userId: number): Promise<void> {
    const task = await this.findOneTask(taskId, userId);
    await task.destroy();
  }
}

