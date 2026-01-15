import * as dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import type { Message, CallbackQuery } from 'node-telegram-bot-api';
import { UnoGameService, CardColor, CardType, Player, Card } from './game';

dotenv.config();

class UnoBot {
  private bot: TelegramBot | null = null;
  private chatGames = new Map<number, string>(); // chatId -> gameId
  private unoGameService = new UnoGameService();

  constructor() {
    this.initializeBot();
  }

  private initializeBot() {
    // Используем отдельный токен для UNO бота
    const botToken = process.env.UNO_BOT_TOKEN || '8336559057:AAHtmyn93GYhjHQl9vczBem_NxnU4epaM0U';
    
    if (!botToken) {
      console.warn('UNO_BOT_TOKEN not configured, UNO bot disabled');
      return;
    }
    
    try {
      this.bot = new TelegramBot(botToken, { polling: true });
      this.setupCommands();
      console.log(`UNO Telegram bot initialized with token: ${botToken.substring(0, 10)}...`);
      
      // Проверяем, что бот работает
      this.bot.getMe().then((botInfo) => {
        console.log(`UNO Bot is ready! Username: @${botInfo.username}`);
      }).catch((error) => {
        console.error('Failed to get bot info', error);
      });
    } catch (error) {
      console.error('Failed to initialize UNO Telegram bot', error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Обработчик /start
    this.bot.onText(/\/start/, async (msg: Message) => {
      try {
        await this.handleStart(msg);
      } catch (error) {
        console.error('Error handling /start', error);
      }
    });

    // Команда для создания/присоединения к игре
    this.bot.onText(/\/uno_start/, async (msg: Message) => {
      try {
        await this.handleStartGame(msg);
      } catch (error) {
        console.error('Error handling /uno_start', error);
      }
    });

    // Команда для присоединения к игре
    this.bot.onText(/\/uno_join/, async (msg: Message) => {
      try {
        await this.handleJoinGame(msg);
      } catch (error) {
        console.error('Error handling /uno_join', error);
      }
    });

    // Команда для старта игры
    this.bot.onText(/\/uno_go/, async (msg: Message) => {
      try {
        await this.handleGo(msg);
      } catch (error) {
        console.error('Error handling /uno_go', error);
      }
    });

    // Команда для выхода из игры
    this.bot.onText(/\/uno_leave/, async (msg: Message) => {
      try {
        await this.handleLeave(msg);
      } catch (error) {
        console.error('Error handling /uno_leave', error);
      }
    });

    // Обработка callback query (кнопки)
    this.bot.on('callback_query', async (query: CallbackQuery) => {
      try {
        await this.handleCallbackQuery(query);
      } catch (error) {
        console.error('Error handling callback query', error);
      }
    });

    // Обработка текстовых сообщений в ЛС (для выбора цвета WILD карт)
    this.bot.on('message', async (msg: Message) => {
      try {
        // Игнорируем команды и сообщения не в ЛС
        if (!msg.text || msg.text.startsWith('/') || msg.chat.type !== 'private') {
          return;
        }

        // Обрабатываем только текстовые сообщения в ЛС
        await this.handlePrivateMessage(msg);
      } catch (error) {
        console.error('Error handling private message', error);
      }
    });
  }

  private async handleStart(msg: Message) {
    if (!msg.from || !msg.chat || !this.bot) return;

    const chatId = msg.chat.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (isGroup) {
      await this.bot.sendMessage(
        chatId,
        '🎮 Добро пожаловать в UNO бота!\n\n' +
          'Команды для игры:\n' +
          '• /uno_start - Создать игру или присоединиться\n' +
          '• /uno_join - Присоединиться к игре\n' +
          '• /uno_go - Начать игру (минимум 2 игрока)\n' +
          '• /uno_leave - Покинуть игру\n\n' +
          'Карты будут отправляться в личные сообщения!',
      );
    } else {
      await this.bot.sendMessage(
        chatId,
        '🎮 Добро пожаловать в UNO бота!\n\n' +
          'Чтобы начать игру, добавьте бота в группу и используйте команды:\n' +
          '• /uno_start - Создать игру\n' +
          '• /uno_join - Присоединиться\n' +
          '• /uno_go - Начать игру\n\n' +
          'Карты будут приходить в личные сообщения!',
      );
    }
  }

  private async handleStartGame(msg: Message) {
    if (!msg.from || !msg.chat || !this.bot) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Игрок';
    const firstName = msg.from.first_name || 'Игрок';

    // Проверяем, есть ли уже игра в этом чате
    let gameId = this.chatGames.get(chatId);
    let game = gameId ? this.unoGameService.getGame(gameId) : undefined;

    if (!game) {
      // Создаем новую игру
      gameId = this.unoGameService.createGame(chatId);
      this.chatGames.set(chatId, gameId);
      game = this.unoGameService.getGame(gameId);
    }

    if (!game || !gameId) {
      await this.bot.sendMessage(chatId, '❌ Ошибка при создании игры');
      return;
    }

    // Добавляем игрока
    const added = this.unoGameService.addPlayer(gameId, userId, username, firstName);
    if (!added) {
      if (game.players.some((p) => p.userId === userId)) {
        await this.bot.sendMessage(chatId, '✅ Вы уже в игре!');
      } else {
        await this.bot.sendMessage(chatId, '❌ Не удалось присоединиться к игре');
      }
      return;
    }

    await this.bot.sendMessage(
      chatId,
      `🎮 ${firstName} присоединился к игре!\n\n` +
        `Игроков: ${game.players.length}/10\n\n` +
        `Используйте /uno_join чтобы присоединиться\n` +
        `Используйте /uno_go чтобы начать игру`,
    );
  }

  private async handleJoinGame(msg: Message) {
    if (!msg.from || !msg.chat || !this.bot) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Игрок';
    const firstName = msg.from.first_name || 'Игрок';

    const gameId = this.chatGames.get(chatId);
    if (!gameId) {
      await this.bot.sendMessage(chatId, '❌ Нет активной игры. Используйте /uno_start чтобы создать игру');
      return;
    }

    const game = this.unoGameService.getGame(gameId);
    if (!game) {
      await this.bot.sendMessage(chatId, '❌ Игра не найдена');
      return;
    }

    if (game.isGameActive) {
      await this.bot.sendMessage(chatId, '❌ Игра уже началась');
      return;
    }

    const added = this.unoGameService.addPlayer(gameId, userId, username, firstName);
    if (!added) {
      if (game.players.some((p) => p.userId === userId)) {
        await this.bot.sendMessage(chatId, '✅ Вы уже в игре!');
      } else {
        await this.bot.sendMessage(chatId, '❌ Не удалось присоединиться (максимум 10 игроков)');
      }
      return;
    }

    await this.bot.sendMessage(
      chatId,
      `🎮 ${firstName} присоединился к игре!\n\n` + `Игроков: ${game.players.length}/10\n\n` + `Используйте /uno_go чтобы начать игру`,
    );
  }

  private async handleGo(msg: Message) {
    if (!msg.from || !msg.chat || !this.bot) return;

    const chatId = msg.chat.id;
    const gameId = this.chatGames.get(chatId);

    if (!gameId) {
      await this.bot.sendMessage(chatId, '❌ Нет активной игры. Используйте /uno_start чтобы создать игру');
      return;
    }

    const game = this.unoGameService.getGame(gameId);
    if (!game) {
      await this.bot.sendMessage(chatId, '❌ Игра не найдена');
      return;
    }

    if (game.isGameActive) {
      await this.bot.sendMessage(chatId, '❌ Игра уже началась');
      return;
    }

    if (game.players.length < 2) {
      await this.bot.sendMessage(chatId, '❌ Нужно минимум 2 игрока для начала игры');
      return;
    }

    const started = this.unoGameService.startGame(gameId);
    if (!started) {
      await this.bot.sendMessage(chatId, '❌ Не удалось начать игру');
      return;
    }

    // Уведомляем всех игроков
    await this.bot.sendMessage(chatId, '🎮 Игра началась! Карты разосланы в личные сообщения.');

    // Отправляем карты каждому игроку в ЛС
    for (const player of game.players) {
      await this.sendPlayerCards(game, player);
    }

    // Уведомляем о текущем игроке
    await this.notifyCurrentPlayer(game);
  }

  private async handleLeave(msg: Message) {
    if (!msg.from || !msg.chat || !this.bot) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const gameId = this.chatGames.get(chatId);

    if (!gameId) {
      await this.bot.sendMessage(chatId, '❌ Вы не в игре');
      return;
    }

    const game = this.unoGameService.getGame(gameId);
    if (!game) {
      await this.bot.sendMessage(chatId, '❌ Игра не найдена');
      return;
    }

    const removed = this.unoGameService.removePlayer(gameId, userId);
    if (!removed) {
      await this.bot.sendMessage(chatId, '❌ Вы не в игре');
      return;
    }

    await this.bot.sendMessage(chatId, `👋 Игрок покинул игру. Осталось игроков: ${game.players.length}`);

    // Если игра была активна и осталось меньше 2 игроков, заканчиваем игру
    if (game.isGameActive && game.players.length < 2) {
      await this.bot.sendMessage(chatId, '❌ Игра завершена: недостаточно игроков');
      this.unoGameService.endGame(gameId);
      this.chatGames.delete(chatId);
    }
  }

  private async handleCallbackQuery(query: CallbackQuery) {
    if (!query.data || !query.from || !query.message || !this.bot) return;

    const data = query.data.split(':');
    const action = data[0];
    const gameId = data[1];
    const cardId = data[2];
    const userId = query.from.id;

    const game = this.unoGameService.getGame(gameId);
    if (!game || !game.isGameActive) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Игра не активна', show_alert: true });
      return;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.userId !== userId) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Не ваш ход!', show_alert: true });
      return;
    }

    if (action === 'play') {
      const card = currentPlayer.cards.find((c) => c.id === cardId);
      if (!card) {
        await this.bot.answerCallbackQuery(query.id, { text: 'Карта не найдена', show_alert: true });
        return;
      }

      // Проверяем, можно ли сыграть карту
      if (!this.unoGameService.canPlayCard(game, card)) {
        await this.bot.answerCallbackQuery(query.id, { text: 'Эту карту нельзя сыграть', show_alert: true });
        return;
      }

      // Если это WILD карта, нужно выбрать цвет
      if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
        await this.bot.answerCallbackQuery(query.id);
        await this.askForColor(userId, gameId, cardId);
        return;
      }

      // Играем карту
      const played = this.unoGameService.playCard(gameId, userId, cardId);
      if (played) {
        await this.bot.answerCallbackQuery(query.id, { text: 'Карта сыграна!' });
        await this.updateGameState(game);
      } else {
        await this.bot.answerCallbackQuery(query.id, { text: 'Ошибка', show_alert: true });
      }
    } else if (action === 'draw') {
      await this.bot.answerCallbackQuery(query.id);
      const updatedGame = this.unoGameService.getGame(gameId);
      if (!updatedGame) return;
      
      const card = this.unoGameService.drawCard(gameId, userId);
      if (card) {
        const finalGame = this.unoGameService.getGame(gameId);
        if (!finalGame) return;
        
        await this.bot.sendMessage(userId, `Вы взяли карту: ${this.unoGameService.formatCard(card)}`);
        await this.sendPlayerCards(finalGame, currentPlayer);
        await this.updateGameState(finalGame);
      }
    }
  }

  private async handlePrivateMessage(msg: Message) {
    if (!msg.from || !msg.text || !this.bot) return;

    const userId = msg.from.id;
    const text = msg.text.trim().toUpperCase();

    // Ищем активную игру для этого пользователя
    let userGame: { gameId: string; game: any } | null = null;

    for (const [chatId, gameId] of this.chatGames.entries()) {
      const game = this.unoGameService.getGame(gameId);
      if (game && game.isGameActive) {
        const player = game.players.find((p) => p.userId === userId);
        if (player && game.waitingForColor) {
          userGame = { gameId, game };
          break;
        }
      }
    }

    if (!userGame) {
      return; // Не ожидаем выбора цвета
    }

    // Парсим выбор цвета
    let chosenColor: CardColor | null = null;
    if (text.includes('КРАСН') || text.includes('RED') || text === '🔴' || text === 'R') {
      chosenColor = CardColor.RED;
    } else if (text.includes('ЖЕЛТ') || text.includes('YELLOW') || text === '🟡' || text === 'Y') {
      chosenColor = CardColor.YELLOW;
    } else if (text.includes('ЗЕЛЕН') || text.includes('GREEN') || text === '🟢' || text === 'G') {
      chosenColor = CardColor.GREEN;
    } else if (text.includes('СИН') || text.includes('BLUE') || text === '🔵' || text === 'B') {
      chosenColor = CardColor.BLUE;
    }

    if (!chosenColor) {
      await this.bot.sendMessage(
        userId,
        '❌ Пожалуйста, выберите цвет:\n🔴 Красный\n🟡 Желтый\n🟢 Зеленый\n🔵 Синий',
      );
      return;
    }

    // Находим WILD карту в руке игрока
    const player = userGame.game.players.find((p: Player) => p.userId === userId);
    if (!player) return;

    const wildCard = player.cards.find((c: Card) => c.type === CardType.WILD || c.type === CardType.WILD_DRAW_FOUR);
    if (!wildCard) return;

    // Играем карту с выбранным цветом
    const played = this.unoGameService.playCard(userGame.gameId, userId, wildCard.id, chosenColor);
    if (played) {
      await this.bot.sendMessage(userId, `✅ Карта сыграна! Выбран цвет: ${this.getColorEmoji(chosenColor)}`);
      await this.updateGameState(userGame.game);
    }
  }

  private async askForColor(userId: number, gameId: string, cardId: string): Promise<void> {
    if (!this.bot) return;
    await this.bot.sendMessage(
      userId,
      '🎨 Выберите цвет для WILD карты:\n\n' + '🔴 Красный\n🟡 Желтый\n🟢 Зеленый\n🔵 Синий\n\n' + 'Напишите название цвета или эмодзи',
    );
  }

  private async sendPlayerCards(game: any, player: Player): Promise<void> {
    if (!game.isGameActive || !this.bot) return;

    const cardsText = player.cards.map((card) => this.unoGameService.formatCard(card)).join('\n');

    const keyboard = {
      inline_keyboard: [
        ...player.cards.map((card) => [
          {
            text: this.unoGameService.formatCard(card),
            callback_data: `play:${game.gameId}:${card.id}`,
          },
        ]),
        [
          {
            text: '🃏 Взять карту',
            callback_data: `draw:${game.gameId}:`,
          },
        ],
      ],
    };

    try {
      await this.bot.sendMessage(player.userId, `🎴 Ваши карты (${player.cards.length}):\n\n${cardsText}`, {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error(`Failed to send cards to user ${player.userId}`, error);
      // Если не можем отправить в ЛС, отправляем в группу
      await this.bot.sendMessage(
        game.chatId,
        `⚠️ Не удалось отправить карты ${player.firstName} в ЛС. Проверьте, что бот может отправлять вам сообщения.`,
      );
    }
  }

  private async notifyCurrentPlayer(game: any): Promise<void> {
    if (!this.bot) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    const topCardText = game.topCard ? this.unoGameService.formatCard(game.topCard) : 'Нет карты';

    await this.bot.sendMessage(
      game.chatId,
      `🎯 Ход игрока: ${currentPlayer.firstName}\n` + `📊 Карт в руке: ${currentPlayer.cards.length}\n` + `🃏 Верхняя карта: ${topCardText}\n` + `🎨 Текущий цвет: ${this.getColorEmoji(game.currentColor)}`,
    );

    // Отправляем карты текущему игроку
    await this.sendPlayerCards(game, currentPlayer);
  }

  private async updateGameState(game: any): Promise<void> {
    if (!this.bot) return;
    // Проверяем, не закончилась ли игра
    const winner = game.players.find((p: Player) => p.cards.length === 0);
    if (winner) {
      await this.bot.sendMessage(game.chatId, `🎉 Победитель: ${winner.firstName}! Поздравляем!`);
      this.unoGameService.endGame(game.gameId);
      this.chatGames.delete(game.chatId);
      return;
    }

    // Обновляем карты всех игроков
    for (const player of game.players) {
      await this.sendPlayerCards(game, player);
    }

    // Уведомляем о текущем игроке
    await this.notifyCurrentPlayer(game);
  }

  private getColorEmoji(color: CardColor | null): string {
    if (!color) return '⚫';
    const emojis = {
      [CardColor.RED]: '🔴',
      [CardColor.YELLOW]: '🟡',
      [CardColor.GREEN]: '🟢',
      [CardColor.BLUE]: '🔵',
      [CardColor.WILD]: '⚫',
    };
    return emojis[color] || '⚫';
  }
}

// Запускаем бота
const bot = new UnoBot();

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\nShutting down UNO bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down UNO bot...');
  process.exit(0);
});

