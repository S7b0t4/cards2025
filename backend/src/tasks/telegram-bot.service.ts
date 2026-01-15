import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
const TelegramBot = require('node-telegram-bot-api');
type Message = import('node-telegram-bot-api').Message;
type CallbackQuery = import('node-telegram-bot-api').CallbackQuery;
import { TaskGroup } from './task-group.model';
import { TasksService } from './tasks.service';
import { User } from '../users/user.model';

interface UserState {
  action?: 'create' | 'edit' | 'delete' | 'create_task' | 'edit_task';
  groupId?: number;
  taskId?: number;
  field?: 'name' | 'description' | 'color' | 'task_name' | 'task_description' | 'task_status' | 'task_priority';
  tempData?: {
    name?: string;
    description?: string;
    color?: string;
    taskName?: string;
    taskDescription?: string;
  };
}

@Injectable()
export class TasksTelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TasksTelegramBotService.name);
  private bot: any = null;
  private userStates = new Map<number, UserState>();
  private userLastMessages = new Map<number, number>(); // telegramId -> messageId
  private userTaskMessages = new Map<number, number[]>(); // telegramId -> array of messageIds for task messages
  private taskMessageMap = new Map<number, Map<number, number>>(); // telegramId -> (taskId -> messageId)

  constructor(
    private configService: ConfigService,
    private tasksService: TasksService,
    @InjectModel(TaskGroup)
    private taskGroupModel: typeof TaskGroup,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  onModuleInit() {
    this.initializeBot();
  }

  private initializeBot() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured, bot disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(botToken, { polling: true });
      this.setupCommands();
      this.logger.log('Telegram bot initialized for task management');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Start command
    this.bot.onText(/\/start/, async (msg: Message) => {
      try {
        await this.handleStart(msg);
      } catch (error) {
        this.logger.error('Error handling /start command', error);
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg: Message) => {
      try {
        await this.handleHelp(msg);
      } catch (error) {
        this.logger.error('Error handling /help command', error);
      }
    });

    // List groups
    this.bot.onText(/\/groups/, async (msg: Message) => {
      try {
        await this.handleListGroups(msg);
      } catch (error) {
        this.logger.error('Error handling /groups command', error);
      }
    });

    // Create group
    this.bot.onText(/\/create/, async (msg: Message) => {
      try {
        await this.handleCreateGroup(msg);
      } catch (error) {
        this.logger.error('Error handling /create command', error);
      }
    });

    // Callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (query: CallbackQuery) => {
      try {
        await this.handleCallbackQuery(query);
      } catch (error) {
        this.logger.error('Error handling callback query', error);
        if (this.bot && query.id) {
          try {
            await this.bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка. Попробуйте позже.' });
          } catch (e) {
            // Ignore
          }
        }
      }
    });

    // Text messages (for input)
    this.bot.on('message', async (msg: Message) => {
      if (msg.text && !msg.text.startsWith('/')) {
        try {
          await this.handleTextInput(msg);
        } catch (error) {
          this.logger.error('Error handling text input', error);
        }
      }
    });

    // Error handler for bot
    this.bot.on('error', (error) => {
      this.logger.error('Telegram bot error', error);
    });

    this.bot.on('polling_error', (error) => {
      this.logger.error('Telegram bot polling error', error);
    });
  }

  private async handleStart(msg: Message) {
    if (!this.bot) return;

    const telegramId = msg.from?.id;
    if (!telegramId) return;

    // Check if user exists
    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.bot.sendMessage(
        telegramId,
        '❌ Вы не зарегистрированы в системе. Пожалуйста, сначала зарегистрируйтесь через веб-интерфейс.',
      );
      return;
    }

    const welcomeMessage = `
👋 <b>Добро пожаловать в менеджер задач!</b>

Используйте команды для управления группами задач:

/groups - Просмотреть все группы
/create - Создать новую группу
/help - Показать справку

Выберите действие:
    `.trim();

    await this.sendOrUpdateMessage(telegramId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Мои группы', callback_data: 'list_groups' }],
          [{ text: '➕ Создать группу', callback_data: 'create_group' }],
        ],
      },
    });
  }

  private async handleHelp(msg: Message) {
    if (!this.bot) return;

    const telegramId = msg.from?.id;
    if (!telegramId) return;

    const helpMessage = `
📖 <b>Справка по командам:</b>

/groups - Просмотреть все ваши группы задач
/create - Создать новую группу задач
/help - Показать эту справку

<b>Управление группами:</b>
• Нажмите на группу в списке, чтобы просмотреть детали
• Используйте кнопки для редактирования или удаления
• При создании/редактировании следуйте инструкциям бота
    `.trim();

    await this.sendOrUpdateMessage(telegramId, helpMessage, {
      parse_mode: 'HTML',
    });
  }

  private async handleListGroups(msg: Message) {
    if (!this.bot) return;

    const telegramId = msg.from?.id;
    if (!telegramId) return;

    await this.sendGroupsList(telegramId);
  }

  private async sendGroupsList(telegramId: number) {
    if (!this.bot) {
      this.logger.warn('Bot not initialized');
      return;
    }

    try {
      const user = await this.userModel.findOne({ where: { telegramId } });
      if (!user) {
        await this.sendOrUpdateMessage(telegramId, '❌ Пользователь не найден');
        return;
      }

      const groups = await this.tasksService.findAll(user.id);

    if (groups.length === 0) {
      await this.sendOrUpdateMessage(
        telegramId,
        '📭 У вас пока нет групп задач.\n\nИспользуйте /create для создания новой группы.',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Создать группу', callback_data: 'create_group' }]],
          },
        },
      );
      return;
    }

    let message = `📋 <b>Ваши группы задач (${groups.length}):</b>\n\n`;
    const keyboard = [];

    for (const group of groups) {
      const emoji = group.color ? '🎨' : '📁';
      message += `${emoji} <b>${group.name}</b>\n`;
      if (group.description) {
        message += `   ${group.description}\n`;
      }
      message += `   ID: ${group.id}\n\n`;

      keyboard.push([
        {
          text: `👁️ ${group.name}`,
          callback_data: `view_group_${group.id}`,
        },
      ]);
    }

    keyboard.push([{ text: '➕ Создать группу', callback_data: 'create_group' }]);

    await this.sendOrUpdateMessage(telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    } catch (error: any) {
      this.logger.error('Error in sendGroupsList', error?.message || error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // Re-throw to be caught by caller
    }
  }

  private async handleCreateGroup(msg: Message) {
    if (!this.bot) {
      this.logger.warn('Bot not initialized');
      return;
    }

    const telegramId = msg.from?.id;
    if (!telegramId) {
      this.logger.warn('No telegram ID in message');
      return;
    }

    try {
      const user = await this.userModel.findOne({ where: { telegramId } });
      if (!user) {
        await this.sendOrUpdateMessage(telegramId, '❌ Пользователь не найден');
        return;
      }

      this.userStates.set(telegramId, { action: 'create', field: 'name' });

      await this.sendOrUpdateMessage(
        telegramId,
        '➕ <b>Создание новой группы</b>\n\nВведите название группы:',
        { parse_mode: 'HTML' },
      );
    } catch (error: any) {
      this.logger.error('Error in handleCreateGroup', error?.message || error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // Re-throw to be caught by caller
    }
  }

  private async handleCallbackQuery(query: CallbackQuery) {
    if (!this.bot) return;

    const telegramId = query.from.id;
    const data = query.data;
    this.logger.debug('Received callback query', { telegramId, data });

    if (!data) return;

    try {
      await this.bot.answerCallbackQuery(query.id);
    } catch (error: any) {
      // Ignore "query is too old" errors - they happen after bot restart
      if (error?.response?.body?.description?.includes('query is too old')) {
        this.logger.debug('Callback query expired (normal after restart)');
      } else {
        this.logger.error('Error answering callback query', error);
      }
    }

    // List groups
    if (data === 'list_groups') {
      try {
        await this.sendGroupsList(telegramId);
      } catch (error: any) {
        this.logger.error('Error in list_groups', error?.message || error);
        this.logger.error('Error stack:', error?.stack);
        try {
          await this.sendError(telegramId);
        } catch (sendError) {
          this.logger.error('Failed to send error message', sendError);
        }
      }
      return;
    }

    // Create group
    if (data === 'create_group') {
      try {
        // Use chat.id from query if message is not available
        const chatId = query.message?.chat?.id || query.from.id;
        
        if (!query.message) {
          // If message is not available, create a fake message object with user info
          const fakeMessage: Message = {
            message_id: 0,
            from: query.from,
            chat: { id: chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
          } as Message;
          await this.handleCreateGroup(fakeMessage);
        } else {
          await this.handleCreateGroup(query.message as Message);
        }
      } catch (error: any) {
        // Check error type more carefully
        const errorMessage = error?.response?.body?.description || error?.message || String(error);
        
        // Ignore "bots can't send messages to bots" - user might be a bot
        if (errorMessage.includes("bots can't send messages")) {
          this.logger.debug('Cannot send message to bot user');
          return; // Don't send error message in this case
        } else {
          this.logger.error('Error in create_group', errorMessage);
          this.logger.error('Error stack:', error?.stack);
          this.logger.error('Full error:', JSON.stringify(error, null, 2));
          try {
            await this.sendError(telegramId);
          } catch (sendError) {
            this.logger.error('Failed to send error message', sendError);
          }
        }
      }
      return;
    }

    // View group
    if (data.startsWith('view_group_')) {
      try {
        const groupId = parseInt(data.replace('view_group_', ''));
        await this.handleViewGroup(telegramId, groupId);
      } catch (error) {
        this.logger.error('Error in view_group', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Edit group
    if (data.startsWith('edit_group_')) {
      try {
        const groupId = parseInt(data.replace('edit_group_', ''));
        await this.handleEditGroup(telegramId, groupId);
      } catch (error) {
        this.logger.error('Error in edit_group', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Delete group
    if (data.startsWith('delete_group_')) {
      try {
        const groupId = parseInt(data.replace('delete_group_', ''));
        await this.handleDeleteGroup(telegramId, groupId);
      } catch (error) {
        this.logger.error('Error in delete_group', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Edit field
    if (data.startsWith('edit_field_')) {
      try {
        const parts = data.replace('edit_field_', '').split('_');
        const groupId = parseInt(parts[0]);
        const field = parts[1] as 'name' | 'description' | 'color';
        await this.handleEditField(telegramId, groupId, field);
      } catch (error) {
        this.logger.error('Error in edit_field', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Confirm delete task (must be checked BEFORE confirm_delete_)
    if (data.startsWith('confirm_delete_task_')) {
      try {
        const taskIdStr = data.replace('confirm_delete_task_', '');
        const taskId = parseInt(taskIdStr);
        this.logger.debug('Processing confirm_delete_task', { data, taskIdStr, taskId, telegramId });
        if (isNaN(taskId)) {
          this.logger.error('Invalid taskId in confirm_delete_task', { data, taskIdStr });
          await this.sendError(telegramId);
          return;
        }
        await this.confirmDeleteTask(telegramId, taskId);
      } catch (error: any) {
        this.logger.error('Error in confirm_delete_task', error?.message || error);
        this.logger.error('Error stack:', error?.stack);
        this.logger.error('Full error:', JSON.stringify(error, null, 2));
        await this.sendError(telegramId);
      }
      return;
    }

    // Edit task field (must be checked BEFORE edit_task_)
    if (data.startsWith('edit_task_field_')) {
      try {
        const parts = data.replace('edit_task_field_', '').split('_');
        const taskId = parseInt(parts[0]);
        if (isNaN(taskId)) {
          this.logger.error('Invalid taskId in edit_task_field', { data, parts });
          await this.sendError(telegramId);
          return;
        }
        const field = parts.slice(1).join('_') as 'task_name' | 'task_description' | 'task_status' | 'task_priority';
        await this.handleEditTaskField(telegramId, taskId, field);
      } catch (error) {
        this.logger.error('Error in edit_task_field', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Create task
    if (data.startsWith('create_task_')) {
      try {
        const groupId = parseInt(data.replace('create_task_', ''));
        await this.handleCreateTask(telegramId, groupId);
      } catch (error) {
        this.logger.error('Error in create_task', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // List tasks
    if (data.startsWith('list_tasks_')) {
      try {
        const groupId = parseInt(data.replace('list_tasks_', ''));
        await this.handleListTasks(telegramId, groupId);
      } catch (error) {
        this.logger.error('Error in list_tasks', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // View task
    if (data.startsWith('view_task_')) {
      try {
        const taskId = parseInt(data.replace('view_task_', ''));
        if (isNaN(taskId)) {
          this.logger.error('Invalid taskId in view_task', data);
          await this.sendError(telegramId);
          return;
        }
        await this.handleViewTask(telegramId, taskId);
      } catch (error) {
        this.logger.error('Error in view_task', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Edit task
    if (data.startsWith('edit_task_')) {
      try {
        const taskIdStr = data.replace('edit_task_', '');
        const taskId = parseInt(taskIdStr);
        if (isNaN(taskId)) {
          this.logger.error('Invalid taskId in edit_task', { data, taskIdStr });
          await this.sendError(telegramId);
          return;
        }
        await this.handleEditTask(telegramId, taskId);
      } catch (error) {
        this.logger.error('Error in edit_task', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Delete task
    if (data.startsWith('delete_task_')) {
      try {
        const taskId = parseInt(data.replace('delete_task_', ''));
        await this.handleDeleteTask(telegramId, taskId);
      } catch (error) {
        this.logger.error('Error in delete_task', error);
        await this.sendError(telegramId);
      }
      return;
    }

    // Confirm delete group (must be checked AFTER confirm_delete_task_)
    if (data.startsWith('confirm_delete_')) {
      try {
        const groupIdStr = data.replace('confirm_delete_', '');
        const groupId = parseInt(groupIdStr);
        this.logger.debug('Processing confirm_delete (group)', { data, groupIdStr, groupId, telegramId });
        if (isNaN(groupId)) {
          this.logger.error('Invalid groupId in confirm_delete', { data, groupIdStr });
          await this.sendError(telegramId);
          return;
        }
        await this.confirmDeleteGroup(telegramId, groupId);
      } catch (error: any) {
        this.logger.error('Error in confirm_delete (group)', error?.message || error);
        this.logger.error('Error stack:', error?.stack);
        this.logger.error('Full error:', JSON.stringify(error, null, 2));
        await this.sendError(telegramId);
      }
      return;
    }

    // Clear state when navigating (cancel action)
    if (data === 'list_groups') {
      this.userStates.delete(telegramId);
    }
    if (data.startsWith('view_group_')) {
      this.userStates.delete(telegramId);
    }
  }

  private async handleViewGroup(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.bot.sendMessage(telegramId, '❌ Пользователь не найден');
      return;
    }

    try {
      const group = await this.tasksService.findOne(groupId, user.id);

      let message = `📁 <b>${group.name}</b>\n\n`;
      if (group.description) {
        message += `📝 <b>Описание:</b> ${group.description}\n`;
      }
      if (group.color) {
        message += `🎨 <b>Цвет:</b> ${group.color}\n`;
      }
      message += `\n🆔 ID: ${group.id}\n`;
      message += `📅 Создано: ${new Date(group.createdAt).toLocaleDateString('ru-RU')}\n\n`;

      // Show tasks
      const tasks = group.tasks || [];
      if (tasks.length > 0) {
        message += `📋 <b>Задачи (${tasks.length}):</b>\n\n`;
        tasks.forEach((task, index) => {
          if (!task || !task.id) {
            this.logger.warn('Task without id found', task);
            return;
          }
          
          const statusEmoji = {
            todo: '⏳',
            in_progress: '🔄',
            done: '✅',
            cancelled: '❌',
          }[task.status] || '⏳';
          
          const priorityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            urgent: '🔴',
          }[task.priority] || '🟡';

          message += `${statusEmoji} ${priorityEmoji} <b>${task.name}</b>\n`;
          if (task.description) {
            message += `   ${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}\n`;
          }
          if (task.dueDate) {
            message += `   📅 ${new Date(task.dueDate).toLocaleDateString('ru-RU')}\n`;
          }
          message += `   [ID: ${task.id}]\n\n`;
        });
      } else {
        message += `📭 Задач пока нет\n`;
      }

      const keyboard = [
        [{ text: '➕ Добавить задачу', callback_data: `create_task_${groupId}` }],
      ];

      if (tasks.length > 0) {
        keyboard.push([{ text: '📋 Показать все задачи', callback_data: `list_tasks_${groupId}` }]);
      }

      keyboard.push([
        { text: '✏️ Редактировать группу', callback_data: `edit_group_${groupId}` },
        { text: '🗑️ Удалить группу', callback_data: `delete_group_${groupId}` },
      ]);
      keyboard.push([{ text: '🔙 К списку групп', callback_data: 'list_groups' }]);

      await this.sendOrUpdateMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      this.logger.error('Error in handleViewGroup', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Группа не найдена');
    }
  }

  private async handleEditGroup(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      const group = await this.tasksService.findOne(groupId, user.id);

      await this.sendOrUpdateMessage(
        telegramId,
        `✏️ <b>Редактирование группы "${group.name}"</b>\n\nЧто вы хотите изменить?`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Название', callback_data: `edit_field_${groupId}_name` }],
              [{ text: '📄 Описание', callback_data: `edit_field_${groupId}_description` }],
              [{ text: '🎨 Цвет', callback_data: `edit_field_${groupId}_color` }],
              [{ text: '🔙 Назад', callback_data: `view_group_${groupId}` }],
            ],
          },
        },
      );
    } catch (error) {
      await this.sendOrUpdateMessage(telegramId, '❌ Группа не найдена');
    }
  }

  private async handleEditField(telegramId: number, groupId: number, field: 'name' | 'description' | 'color') {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    this.userStates.set(telegramId, { action: 'edit', groupId, field });

    const fieldNames = {
      name: 'название',
      description: 'описание',
      color: 'цвет (например, #FF5733)',
    };

    await this.sendOrUpdateMessage(
      telegramId,
      `✏️ Введите новое ${fieldNames[field]}:`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Отмена', callback_data: `view_group_${groupId}` }]],
        },
      },
    );
  }

  private async handleDeleteGroup(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      const group = await this.tasksService.findOne(groupId, user.id);

      await this.sendOrUpdateMessage(
        telegramId,
        `🗑️ <b>Удаление группы</b>\n\nВы уверены, что хотите удалить группу "${group.name}"?\n\nЭто действие нельзя отменить!`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Да, удалить', callback_data: `confirm_delete_${groupId}` }],
              [{ text: '❌ Отмена', callback_data: `view_group_${groupId}` }],
            ],
          },
        },
      );
    } catch (error) {
      await this.sendOrUpdateMessage(telegramId, '❌ Группа не найдена');
    }
  }

  private async confirmDeleteGroup(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      const group = await this.tasksService.findOne(groupId, user.id);
      await this.tasksService.remove(groupId, user.id);

      await this.sendOrUpdateMessage(
        telegramId,
        `✅ Группа "${group.name}" успешно удалена`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '📋 К списку групп', callback_data: 'list_groups' }]],
          },
        },
      );
    } catch (error) {
      await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при удалении группы');
    }
  }

  private async handleTextInput(msg: Message) {
    if (!this.bot) return;

    const telegramId = msg.from?.id;
    if (!telegramId || !msg.text) return;

    const state = this.userStates.get(telegramId);
    if (!state || !state.action) return;

    // Delete user's message
    try {
      if (msg.message_id) {
        await this.bot.deleteMessage(telegramId, msg.message_id);
      }
    } catch (error: any) {
      // Ignore errors if message doesn't exist or is too old
      this.logger.debug('Could not delete user message', error?.message);
    }

    try {
      const user = await this.userModel.findOne({ where: { telegramId } });
      if (!user) {
        await this.sendOrUpdateMessage(telegramId, '❌ Пользователь не найден');
        this.userStates.delete(telegramId);
        return;
      }

      if (state.action === 'create') {
        await this.processCreateGroup(telegramId, user.id, msg.text, state);
      } else if (state.action === 'edit' && state.groupId && state.field) {
        await this.processEditGroup(telegramId, user.id, state.groupId, state.field, msg.text);
      } else if (state.action === 'create_task' && state.groupId) {
        await this.processCreateTask(telegramId, user.id, state.groupId, msg.text, state);
      } else if (state.action === 'edit_task' && state.taskId && state.field) {
        await this.processEditTask(telegramId, user.id, state.taskId, state.field, msg.text);
      }
    } catch (error) {
      this.logger.error('Error handling text input', error);
      await this.sendError(telegramId);
      this.userStates.delete(telegramId);
    }
  }

  // Task handlers
  private async handleCreateTask(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.bot.sendMessage(telegramId, '❌ Пользователь не найден');
      return;
    }

    try {
      // Verify group exists and belongs to user
      await this.tasksService.findOne(groupId, user.id);

      this.userStates.set(telegramId, { action: 'create_task', groupId, field: 'task_name' });

      await this.sendOrUpdateMessage(
        telegramId,
        '➕ <b>Создание новой задачи</b>\n\nВведите название задачи:',
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error('Error in handleCreateTask', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Группа не найдена');
    }
  }

  private async handleListTasks(telegramId: number, groupId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.sendOrUpdateMessage(telegramId, '❌ Пользователь не найден');
      return;
    }

    try {
      // Delete previous task messages
      const previousTaskMessages = this.userTaskMessages.get(telegramId) || [];
      for (const msgId of previousTaskMessages) {
        try {
          await this.bot.deleteMessage(telegramId, msgId);
        } catch (error: any) {
          // Ignore errors if message doesn't exist or is too old
          this.logger.debug('Could not delete previous task message', error?.message);
        }
      }
      this.userTaskMessages.set(telegramId, []);
      // Clear task message map for this user
      this.taskMessageMap.delete(telegramId);

      const group = await this.tasksService.findOne(groupId, user.id);
      const tasks = group.tasks || [];

      if (tasks.length === 0) {
        await this.sendOrUpdateMessage(
          telegramId,
          '📭 В этой группе пока нет задач.\n\nИспользуйте кнопку "➕ Добавить задачу" для создания.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '➕ Добавить задачу', callback_data: `create_task_${groupId}` }],
                [{ text: '🔙 К группе', callback_data: `view_group_${groupId}` }],
              ],
            },
          },
        );
        return;
      }

      // Send header message as a new message (not updating previous)
      const headerMessage = await this.bot.sendMessage(
        telegramId,
        `📋 <b>Задачи в группе "${group.name}" (${tasks.length}):</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Добавить задачу', callback_data: `create_task_${groupId}` }],
              [{ text: '🔙 К группе', callback_data: `view_group_${groupId}` }],
            ],
          },
        },
      );

      // Send each task as a separate message with edit/delete buttons
      const taskMessageIds: number[] = [];
      if (headerMessage?.message_id) {
        taskMessageIds.push(headerMessage.message_id);
      }
      for (const task of tasks) {
        if (!task || !task.id) {
          this.logger.warn('Task without id found in list', task);
          continue;
        }
        
        const statusEmoji = {
          todo: '⏳',
          in_progress: '🔄',
          done: '✅',
          cancelled: '❌',
        }[task.status] || '⏳';
        
        const priorityEmoji = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          urgent: '🔴',
        }[task.priority] || '🟡';

        let taskMessage = `${statusEmoji} ${priorityEmoji} <b>${task.name}</b>\n`;
        if (task.description) {
          taskMessage += `📝 ${task.description}\n`;
        }
        taskMessage += `📊 Статус: ${this.getStatusText(task.status)}\n`;
        taskMessage += `⚡ Приоритет: ${this.getPriorityText(task.priority)}\n`;
        if (task.dueDate) {
          taskMessage += `📅 Срок: ${new Date(task.dueDate).toLocaleDateString('ru-RU')}\n`;
        }
        taskMessage += `🆔 ID: ${task.id}`;

        // Send each task as a separate message (don't update, send new)
        const sentMessage = await this.bot.sendMessage(telegramId, taskMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✏️ Редактировать', callback_data: `edit_task_${task.id}` },
                { text: '🗑️ Удалить', callback_data: `delete_task_${task.id}` },
              ],
              [{ text: '👁️ Подробнее', callback_data: `view_task_${task.id}` }],
            ],
          },
        });
        
        if (sentMessage?.message_id) {
          taskMessageIds.push(sentMessage.message_id);
          // Store mapping: taskId -> messageId
          if (!this.taskMessageMap.has(telegramId)) {
            this.taskMessageMap.set(telegramId, new Map());
          }
          this.taskMessageMap.get(telegramId)!.set(task.id, sentMessage.message_id);
        }
      }
      
      // Save task message IDs for future deletion
      this.userTaskMessages.set(telegramId, taskMessageIds);
    } catch (error) {
      this.logger.error('Error in handleListTasks', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при получении списка задач');
    }
  }

  private async handleViewTask(telegramId: number, taskId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.sendMessage(telegramId, '❌ Пользователь не найден');
      return;
    }

    try {
      if (isNaN(taskId) || taskId <= 0) {
        this.logger.error('Invalid taskId in handleViewTask', { taskId, telegramId });
        await this.sendOrUpdateMessage(telegramId, '❌ Неверный ID задачи');
        return;
      }

      const task = await this.tasksService.findOneTask(taskId, user.id);
      if (!task) {
        await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
        return;
      }
      
      const group = await this.tasksService.findOne(task.taskGroupId, user.id);

      const statusEmoji = {
        todo: '⏳',
        in_progress: '🔄',
        done: '✅',
        cancelled: '❌',
      }[task.status] || '⏳';
      
      const priorityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴',
      }[task.priority] || '🟡';

      let message = `${statusEmoji} ${priorityEmoji} <b>${task.name}</b>\n\n`;
      
      if (task.description) {
        message += `📝 <b>Описание:</b> ${task.description}\n`;
      }
      
      message += `\n📊 <b>Статус:</b> ${this.getStatusText(task.status)}\n`;
      message += `⚡ <b>Приоритет:</b> ${this.getPriorityText(task.priority)}\n`;
      
      if (task.dueDate) {
        message += `📅 <b>Срок:</b> ${new Date(task.dueDate).toLocaleDateString('ru-RU')}\n`;
      }
      
      message += `\n📁 <b>Группа:</b> ${group.name}\n`;
      message += `🆔 ID: ${task.id}\n`;

      await this.sendOrUpdateMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Редактировать', callback_data: `edit_task_${task.id}` },
              { text: '🗑️ Удалить', callback_data: `delete_task_${task.id}` },
            ],
            [{ text: '🔙 К группе', callback_data: `view_group_${group.id}` }],
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error in handleViewTask', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
    }
  }

  private async handleEditTask(telegramId: number, taskId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      if (isNaN(taskId) || taskId <= 0) {
        this.logger.error('Invalid taskId in handleEditTask', { taskId, telegramId });
        await this.sendOrUpdateMessage(telegramId, '❌ Неверный ID задачи');
        return;
      }

      const task = await this.tasksService.findOneTask(taskId, user.id);
      if (!task) {
        await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
        return;
      }

      await this.sendOrUpdateMessage(
        telegramId,
        `✏️ <b>Редактирование задачи "${task.name}"</b>\n\nЧто вы хотите изменить?`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Название', callback_data: `edit_task_field_${task.id}_task_name` }],
              [{ text: '📄 Описание', callback_data: `edit_task_field_${task.id}_task_description` }],
              [{ text: '📊 Статус', callback_data: `edit_task_field_${task.id}_task_status` }],
              [{ text: '⚡ Приоритет', callback_data: `edit_task_field_${task.id}_task_priority` }],
              [{ text: '🔙 Назад', callback_data: `view_task_${task.id}` }],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.error('Error in handleEditTask', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
    }
  }

  private async handleDeleteTask(telegramId: number, taskId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      const task = await this.tasksService.findOneTask(taskId, user.id);
      const group = await this.tasksService.findOne(task.taskGroupId, user.id);

      await this.sendOrUpdateMessage(
        telegramId,
        `🗑️ <b>Удаление задачи</b>\n\nВы уверены, что хотите удалить задачу "${task.name}"?\n\nЭто действие нельзя отменить!`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Да, удалить', callback_data: `confirm_delete_task_${task.id}` }],
              [{ text: '❌ Отмена', callback_data: `view_task_${task.id}` }],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.error('Error in handleDeleteTask', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
    }
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      todo: 'К выполнению',
      in_progress: 'В работе',
      done: 'Выполнено',
      cancelled: 'Отменено',
    };
    return statusMap[status] || status;
  }

  private getPriorityText(priority: string): string {
    const priorityMap: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочно',
    };
    return priorityMap[priority] || priority;
  }

  private async handleEditTaskField(telegramId: number, taskId: number, field: 'task_name' | 'task_description' | 'task_status' | 'task_priority') {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) return;

    try {
      const task = await this.tasksService.findOneTask(taskId, user.id);
      this.userStates.set(telegramId, { action: 'edit_task', taskId, field });

      const fieldNames = {
        task_name: 'название',
        task_description: 'описание',
        task_status: 'статус (к выполнению, в работе, выполнено, отменено)',
        task_priority: 'приоритет (низкий, средний, высокий, срочно)',
      };

      await this.sendOrUpdateMessage(
        telegramId,
        `✏️ Введите новое ${fieldNames[field]}:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: `view_task_${task.id}` }]],
          },
        },
      );
    } catch (error) {
      this.logger.error('Error in handleEditTaskField', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
    }
  }

  private async confirmDeleteTask(telegramId: number, taskId: number) {
    if (!this.bot) return;

    const user = await this.userModel.findOne({ where: { telegramId } });
    if (!user) {
      await this.sendMessage(telegramId, '❌ Пользователь не найден');
      return;
    }

    try {
      if (isNaN(taskId) || taskId <= 0) {
        this.logger.error('Invalid taskId in confirmDeleteTask', { taskId, telegramId });
        await this.sendOrUpdateMessage(telegramId, '❌ Неверный ID задачи');
        return;
      }

      const task = await this.tasksService.findOneTask(taskId, user.id);
      if (!task) {
        await this.sendOrUpdateMessage(telegramId, '❌ Задача не найдена');
        return;
      }

      const groupId = task.taskGroupId;
      
      // Delete task message if it exists
      const userTaskMap = this.taskMessageMap.get(telegramId);
      if (userTaskMap) {
        const taskMessageId = userTaskMap.get(taskId);
        if (taskMessageId) {
          try {
            await this.bot.deleteMessage(telegramId, taskMessageId);
          } catch (error: any) {
            this.logger.debug('Could not delete task message', error?.message);
          }
          userTaskMap.delete(taskId);
        }
        // Also remove from task messages array
        const taskMessages = this.userTaskMessages.get(telegramId) || [];
        const updatedMessages = taskMessages.filter(id => id !== taskMessageId);
        this.userTaskMessages.set(telegramId, updatedMessages);
      }
      
      await this.tasksService.removeTask(taskId, user.id);

      await this.sendOrUpdateMessage(
        telegramId,
        `✅ Задача "${task.name}" успешно удалена`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '📁 К группе', callback_data: `view_group_${groupId}` }]],
          },
        },
      );
    } catch (error: any) {
      this.logger.error('Error in confirmDeleteTask', error?.message || error);
      this.logger.error('Error stack:', error?.stack);
      this.logger.error('Full error:', JSON.stringify(error, null, 2));
      try {
        await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при удалении задачи');
      } catch (sendError) {
        this.logger.error('Failed to send error message', sendError);
      }
    }
  }

  private async sendError(telegramId: number) {
    if (!this.bot) return;
    try {
      await this.sendOrUpdateMessage(
        telegramId,
        '❌ Произошла ошибка при обработке запроса. Попробуйте позже или используйте /start для возврата в главное меню.',
      );
    } catch (error) {
      this.logger.error('Error sending error message', error);
    }
  }

  private async processCreateGroup(telegramId: number, userId: number, text: string, state: UserState) {
    if (!this.bot) return;

    if (state.field === 'name') {
      // Save name and ask for description
      const tempData = { name: text };
      this.userStates.set(telegramId, {
        action: 'create',
        field: 'description',
        tempData,
      });

      await this.sendOrUpdateMessage(
        telegramId,
        '✅ Название сохранено!\n\nВведите описание группы (или отправьте "-" чтобы пропустить):',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'list_groups' }]],
          },
        },
      );
    } else if (state.field === 'description') {
      // Save description and ask for color
      const tempData = {
        ...state.tempData,
        description: text === '-' ? undefined : text,
      };
      this.userStates.set(telegramId, {
        action: 'create',
        field: 'color',
        tempData,
      });

      await this.sendOrUpdateMessage(
        telegramId,
        '✅ Описание сохранено!\n\nВведите цвет группы в формате #RRGGBB (или отправьте "-" чтобы пропустить):',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'list_groups' }]],
          },
        },
      );
    } else if (state.field === 'color') {
      // Create the group
      try {
        const createDto = {
          name: state.tempData?.name || '',
          description: state.tempData?.description,
          color: text === '-' ? undefined : text,
        };

        const group = await this.tasksService.create(userId, createDto);

        await this.sendOrUpdateMessage(
          telegramId,
          `✅ Группа "${group.name}" успешно создана!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '👁️ Просмотреть группу', callback_data: `view_group_${group.id}` }],
                [{ text: '📋 К списку групп', callback_data: 'list_groups' }],
              ],
            },
          },
        );

        this.userStates.delete(telegramId);
      } catch (error) {
        this.logger.error('Error creating group', error);
        await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при создании группы. Попробуйте снова /create');
        this.userStates.delete(telegramId);
      }
    }
  }

  private async processEditGroup(telegramId: number, userId: number, groupId: number, field: string, text: string) {
    if (!this.bot) return;

    try {
      const updateData: any = {};
      updateData[field] = text === '-' ? null : text;

      await this.tasksService.update(groupId, userId, updateData);
      const updatedGroup = await this.tasksService.findOne(groupId, userId);

      await this.sendOrUpdateMessage(telegramId, `✅ Группа успешно обновлена!`, {
        reply_markup: {
          inline_keyboard: [[{ text: '👁️ Просмотреть группу', callback_data: `view_group_${groupId}` }]],
        },
      });

      this.userStates.delete(telegramId);
    } catch (error) {
      await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при обновлении группы');
      this.userStates.delete(telegramId);
    }
  }

  private async processCreateTask(telegramId: number, userId: number, groupId: number, text: string, state: UserState) {
    if (!this.bot) return;

    if (state.field === 'task_name') {
      const tempData = { taskName: text };
      this.userStates.set(telegramId, {
        action: 'create_task',
        groupId,
        field: 'task_description',
        tempData,
      });

      await this.sendOrUpdateMessage(
        telegramId,
        '✅ Название сохранено!\n\nВведите описание задачи (или отправьте "-" чтобы пропустить):',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: `view_group_${groupId}` }]],
          },
        },
      );
    } else if (state.field === 'task_description') {
      try {
        const createDto = {
          taskGroupId: groupId,
          name: state.tempData?.taskName || '',
          description: text === '-' ? undefined : text,
        };

        const task = await this.tasksService.createTask(userId, createDto);
        const group = await this.tasksService.findOne(groupId, userId);

        await this.sendOrUpdateMessage(
          telegramId,
          `✅ Задача "${task.name}" успешно создана!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '👁️ Просмотреть задачу', callback_data: `view_task_${task.id}` }],
                [{ text: '📁 К группе', callback_data: `view_group_${groupId}` }],
              ],
            },
          },
        );

        this.userStates.delete(telegramId);
      } catch (error) {
        this.logger.error('Error creating task', error);
        await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при создании задачи. Попробуйте снова /create');
        this.userStates.delete(telegramId);
      }
    }
  }

  private async processEditTask(telegramId: number, userId: number, taskId: number, field: string, text: string) {
    if (!this.bot) return;

    try {
      const task = await this.tasksService.findOneTask(taskId, userId);
      const updateData: any = {};

      if (field === 'task_name') {
        updateData.name = text;
      } else if (field === 'task_description') {
        updateData.description = text === '-' ? null : text;
      } else if (field === 'task_status') {
        const statusMap: Record<string, string> = {
          'к выполнению': 'todo',
          'в работе': 'in_progress',
          'выполнено': 'done',
          'отменено': 'cancelled',
        };
        updateData.status = statusMap[text.toLowerCase()] || text;
      } else if (field === 'task_priority') {
        const priorityMap: Record<string, string> = {
          'низкий': 'low',
          'средний': 'medium',
          'высокий': 'high',
          'срочно': 'urgent',
        };
        updateData.priority = priorityMap[text.toLowerCase()] || text;
      }

      await this.tasksService.updateTask(taskId, userId, updateData);
      const updatedTask = await this.tasksService.findOneTask(taskId, userId);

      await this.sendOrUpdateMessage(telegramId, `✅ Задача успешно обновлена!`, {
        reply_markup: {
          inline_keyboard: [[{ text: '👁️ Просмотреть задачу', callback_data: `view_task_${taskId}` }]],
        },
      });

      this.userStates.delete(telegramId);
    } catch (error) {
      this.logger.error('Error updating task', error);
      await this.sendOrUpdateMessage(telegramId, '❌ Ошибка при обновлении задачи');
      this.userStates.delete(telegramId);
    }
  }

  /**
   * Send or update message, deleting previous one to keep interface clean
   */
  private async sendOrUpdateMessage(telegramId: number, text: string, options?: any): Promise<any> {
    if (!this.bot) return;

    try {
      // Delete previous message if exists
      const lastMessageId = this.userLastMessages.get(telegramId);
      if (lastMessageId) {
        try {
          await this.bot.deleteMessage(telegramId, lastMessageId);
        } catch (error: any) {
          // Ignore errors if message doesn't exist or is too old
          if (!error?.response?.body?.description?.includes('message to delete not found') &&
              !error?.response?.body?.description?.includes('message can\'t be deleted')) {
            this.logger.debug('Could not delete previous message', error?.message);
          }
        }
      }

      // Send new message
      const sentMessage = await this.bot.sendMessage(telegramId, text, options);
      
      // Save new message ID
      if (sentMessage?.message_id) {
        this.userLastMessages.set(telegramId, sentMessage.message_id);
      }

      return sentMessage;
    } catch (error) {
      this.logger.error('Error in sendOrUpdateMessage', error);
      throw error;
    }
  }

  /**
   * Send a message without deleting previous (for notifications, confirmations, etc.)
   */
  private async sendMessage(telegramId: number, text: string, options?: any): Promise<any> {
    if (!this.bot) return;
    return this.bot.sendMessage(telegramId, text, options);
  }
}

