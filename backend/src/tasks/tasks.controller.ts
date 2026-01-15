import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskGroupDto } from './dto/update-task-group.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('groups')
  @ApiOperation({ summary: 'Create a new task group' })
  create(@Request() req, @Body() createTaskGroupDto: CreateTaskGroupDto) {
    return this.tasksService.create(req.user.id, createTaskGroupDto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all task groups for the current user' })
  findAll(@Request() req) {
    return this.tasksService.findAll(req.user.id);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get a task group by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.tasksService.findOne(+id, req.user.id);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update a task group' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTaskGroupDto: UpdateTaskGroupDto,
  ) {
    return this.tasksService.update(+id, req.user.id, updateTaskGroupDto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete a task group' })
  remove(@Request() req, @Param('id') id: string) {
    return this.tasksService.remove(+id, req.user.id);
  }

  // Task endpoints
  @Post('groups/:groupId/tasks')
  @ApiOperation({ summary: 'Create a new task in a group' })
  createTask(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(req.user.id, {
      ...createTaskDto,
      taskGroupId: +groupId,
    });
  }

  @Get('groups/:groupId/tasks')
  @ApiOperation({ summary: 'Get all tasks in a group' })
  findAllTasks(@Request() req, @Param('groupId') groupId: string) {
    return this.tasksService.findAllTasks(+groupId, req.user.id);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a task by ID' })
  findOneTask(@Request() req, @Param('id') id: string) {
    return this.tasksService.findOneTask(+id, req.user.id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  updateTask(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(+id, req.user.id, updateTaskDto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a task' })
  removeTask(@Request() req, @Param('id') id: string) {
    return this.tasksService.removeTask(+id, req.user.id);
  }
}

