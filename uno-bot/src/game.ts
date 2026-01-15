export enum CardColor {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  WILD = 'WILD',
}

export enum CardType {
  NUMBER = 'NUMBER',
  SKIP = 'SKIP',
  REVERSE = 'REVERSE',
  DRAW_TWO = 'DRAW_TWO',
  WILD = 'WILD',
  WILD_DRAW_FOUR = 'WILD_DRAW_FOUR',
}

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // для NUMBER карт
}

export interface Player {
  userId: number;
  username: string;
  firstName: string;
  cards: Card[];
  isReady: boolean;
}

export interface GameState {
  gameId: string;
  chatId: number;
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counterclockwise
  deck: Card[];
  discardPile: Card[];
  topCard: Card | null;
  currentColor: CardColor | null; // для WILD карт
  isGameActive: boolean;
  waitingForColor: boolean; // если последняя карта была WILD
  drawCount: number; // накопленные карты для DRAW_TWO/WILD_DRAW_FOUR
}

export class UnoGameService {
  private games = new Map<string, GameState>();

  createGame(chatId: number): string {
    const gameId = `game_${chatId}_${Date.now()}`;
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    const game: GameState = {
      gameId,
      chatId,
      players: [],
      currentPlayerIndex: 0,
      direction: 1,
      deck,
      discardPile: [],
      topCard: null,
      currentColor: null,
      isGameActive: false,
      waitingForColor: false,
      drawCount: 0,
    };

    this.games.set(gameId, game);
    console.log(`Created game ${gameId} in chat ${chatId}`);
    return gameId;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getGameByChatId(chatId: number): GameState | undefined {
    for (const game of this.games.values()) {
      if (game.chatId === chatId && game.isGameActive) {
        return game;
      }
    }
    // Ищем неактивную игру для присоединения
    for (const game of this.games.values()) {
      if (game.chatId === chatId && !game.isGameActive) {
        return game;
      }
    }
    return undefined;
  }

  addPlayer(gameId: string, userId: number, username: string, firstName: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    // Проверяем, не добавлен ли уже игрок
    if (game.players.some((p) => p.userId === userId)) {
      return false;
    }

    // Максимум 10 игроков
    if (game.players.length >= 10) {
      return false;
    }

    const player: Player = {
      userId,
      username,
      firstName,
      cards: [],
      isReady: false,
    };

    game.players.push(player);
    console.log(`Player ${username} added to game ${gameId}`);
    return true;
  }

  removePlayer(gameId: string, userId: number): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const playerIndex = game.players.findIndex((p) => p.userId === userId);
    if (playerIndex === -1) return false;

    // Возвращаем карты в колоду
    game.deck.push(...game.players[playerIndex].cards);
    game.players.splice(playerIndex, 1);

    // Если игра была активна и это был текущий игрок, переходим к следующему
    if (game.isGameActive && playerIndex === game.currentPlayerIndex) {
      this.nextPlayer(game);
    }

    return true;
  }

  startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    if (game.players.length < 2) {
      return false; // Минимум 2 игрока
    }

    if (game.isGameActive) {
      return false; // Игра уже начата
    }

    // Раздаем карты (по 7 каждому)
    for (const player of game.players) {
      player.cards = game.deck.splice(0, 7);
    }

    // Кладем первую карту в discard pile
    let firstCard = game.deck.shift();
    while (firstCard && (firstCard.type === CardType.WILD || firstCard.type === CardType.WILD_DRAW_FOUR)) {
      // Не начинаем с WILD карт
      game.deck.push(firstCard);
      firstCard = game.deck.shift();
    }

    if (!firstCard) {
      // Если все карты WILD (маловероятно), создаем новую колоду
      game.deck = this.createDeck();
      this.shuffleDeck(game.deck);
      firstCard = game.deck.shift()!;
    }

    game.discardPile.push(firstCard);
    game.topCard = firstCard;
    game.currentColor = firstCard.color;
    game.isGameActive = true;
    game.currentPlayerIndex = 0;

    // Применяем эффект первой карты
    this.applyCardEffect(game, firstCard);

    console.log(`Game ${gameId} started with ${game.players.length} players`);
    return true;
  }

  canPlayCard(game: GameState, card: Card): boolean {
    if (!game.topCard) return false;

    const topCard = game.topCard;

    // WILD карты можно играть всегда
    if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
      return true;
    }

    // Если цвет совпадает
    if (card.color === game.currentColor) {
      return true;
    }

    // Если тип совпадает (для специальных карт)
    if (card.type === topCard.type && card.type !== CardType.NUMBER) {
      return true;
    }

    // Если число совпадает (для NUMBER карт)
    if (card.type === CardType.NUMBER && topCard.type === CardType.NUMBER && card.value === topCard.value) {
      return true;
    }

    return false;
  }

  playCard(gameId: string, userId: number, cardId: string, chosenColor?: CardColor): boolean {
    const game = this.games.get(gameId);
    if (!game || !game.isGameActive) return false;

    const player = game.players.find((p) => p.userId === userId);
    if (!player) return false;

    // Проверяем, что это ход текущего игрока
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.userId !== userId) {
      return false;
    }

    const cardIndex = player.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = player.cards[cardIndex];

    // Проверяем, можно ли сыграть эту карту
    if (!this.canPlayCard(game, card)) {
      return false;
    }

    // Для WILD карт нужен выбор цвета
    if ((card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) && !chosenColor) {
      game.waitingForColor = true;
      return false; // Нужно выбрать цвет
    }

    // Убираем карту из руки игрока
    player.cards.splice(cardIndex, 1);

    // Кладем на discard pile
    game.discardPile.push(card);
    game.topCard = card;

    // Если это WILD карта, устанавливаем цвет
    if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
      game.currentColor = chosenColor!;
      game.waitingForColor = false;
    } else {
      game.currentColor = card.color;
    }

    // Проверяем победу
    if (player.cards.length === 0) {
      game.isGameActive = false;
      return true; // Игрок выиграл
    }

    // Применяем эффект карты
    this.applyCardEffect(game, card);

    // Переходим к следующему игроку
    this.nextPlayer(game);

    return true;
  }

  drawCard(gameId: string, userId: number): Card | null {
    const game = this.games.get(gameId);
    if (!game || !game.isGameActive) return null;

    const player = game.players.find((p) => p.userId === userId);
    if (!player) return null;

    // Проверяем, что это ход текущего игрока
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.userId !== userId) {
      return null;
    }

    // Если колода закончилась, перемешиваем discard pile (кроме верхней карты)
    if (game.deck.length === 0) {
      const topCard = game.discardPile.pop()!;
      game.deck = [...game.discardPile];
      this.shuffleDeck(game.deck);
      game.discardPile = [topCard];
    }

    const card = game.deck.shift();
    if (!card) return null;

    player.cards.push(card);

    // Если есть накопленные карты (DRAW_TWO/WILD_DRAW_FOUR), берем их
    if (game.drawCount > 0) {
      for (let i = 0; i < game.drawCount; i++) {
        if (game.deck.length === 0) {
          const topCard = game.discardPile.pop()!;
          game.deck = [...game.discardPile];
          this.shuffleDeck(game.deck);
          game.discardPile = [topCard];
        }
        const drawCard = game.deck.shift();
        if (drawCard) {
          player.cards.push(drawCard);
        }
      }
      game.drawCount = 0;
      this.nextPlayer(game);
      return card;
    }

    // После взятия карты переходим к следующему игроку
    this.nextPlayer(game);
    return card;
  }

  private applyCardEffect(game: GameState, card: Card): void {
    switch (card.type) {
      case CardType.SKIP:
        // Пропускаем следующего игрока
        this.nextPlayer(game);
        break;

      case CardType.REVERSE:
        // Меняем направление
        game.direction *= -1;
        // Если только 2 игрока, REVERSE работает как SKIP
        if (game.players.length === 2) {
          this.nextPlayer(game);
        }
        break;

      case CardType.DRAW_TWO:
        // Следующий игрок берет 2 карты
        game.drawCount += 2;
        this.nextPlayer(game);
        break;

      case CardType.WILD_DRAW_FOUR:
        // Следующий игрок берет 4 карты
        game.drawCount += 4;
        this.nextPlayer(game);
        break;

      case CardType.WILD:
      case CardType.NUMBER:
        // Ничего особенного
        break;
    }
  }

  private nextPlayer(game: GameState): void {
    game.currentPlayerIndex += game.direction;

    if (game.currentPlayerIndex >= game.players.length) {
      game.currentPlayerIndex = 0;
    } else if (game.currentPlayerIndex < 0) {
      game.currentPlayerIndex = game.players.length - 1;
    }
  }

  endGame(gameId: string): void {
    this.games.delete(gameId);
    console.log(`Game ${gameId} ended`);
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    const colors = [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE];

    // Числовые карты: 0 по одной, 1-9 по две
    for (const color of colors) {
      deck.push({ id: `${color}_0`, color, type: CardType.NUMBER, value: 0 });
      for (let i = 1; i <= 9; i++) {
        deck.push({ id: `${color}_${i}_1`, color, type: CardType.NUMBER, value: i });
        deck.push({ id: `${color}_${i}_2`, color, type: CardType.NUMBER, value: i });
      }
    }

    // Специальные карты: SKIP, REVERSE, DRAW_TWO (по 2 каждого цвета)
    for (const color of colors) {
      deck.push({ id: `${color}_SKIP_1`, color, type: CardType.SKIP });
      deck.push({ id: `${color}_SKIP_2`, color, type: CardType.SKIP });
      deck.push({ id: `${color}_REVERSE_1`, color, type: CardType.REVERSE });
      deck.push({ id: `${color}_REVERSE_2`, color, type: CardType.REVERSE });
      deck.push({ id: `${color}_DRAW_TWO_1`, color, type: CardType.DRAW_TWO });
      deck.push({ id: `${color}_DRAW_TWO_2`, color, type: CardType.DRAW_TWO });
    }

    // WILD карты: 4 WILD, 4 WILD_DRAW_FOUR
    for (let i = 1; i <= 4; i++) {
      deck.push({ id: `WILD_${i}`, color: CardColor.WILD, type: CardType.WILD });
      deck.push({ id: `WILD_DRAW_FOUR_${i}`, color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR });
    }

    return deck;
  }

  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  formatCard(card: Card): string {
    const colorEmoji = {
      [CardColor.RED]: '🔴',
      [CardColor.YELLOW]: '🟡',
      [CardColor.GREEN]: '🟢',
      [CardColor.BLUE]: '🔵',
      [CardColor.WILD]: '⚫',
    };

    const emoji = colorEmoji[card.color] || '⚫';

    switch (card.type) {
      case CardType.NUMBER:
        return `${emoji} ${card.value}`;
      case CardType.SKIP:
        return `${emoji} ⏭️ SKIP`;
      case CardType.REVERSE:
        return `${emoji} 🔄 REVERSE`;
      case CardType.DRAW_TWO:
        return `${emoji} +2`;
      case CardType.WILD:
        return `${emoji} WILD`;
      case CardType.WILD_DRAW_FOUR:
        return `${emoji} +4`;
      default:
        return `${emoji} UNKNOWN`;
    }
  }
}



