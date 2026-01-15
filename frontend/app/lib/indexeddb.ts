// IndexedDB utilities for offline storage

const DB_NAME = 'CardsAppDB';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_GROUPS = 'groups';
const STORE_STATISTICS = 'statistics';
const STORE_PENDING = 'pendingActions'; // Для синхронизации

interface Card {
  id: number;
  russianWord: string;
  englishWord: string;
  russianDescription?: string;
  englishDescription?: string;
  groupName?: string;
  createdAt: string;
  updatedAt?: string;
  _offline?: boolean; // Флаг для офлайн-созданных карточек
  _pendingSync?: boolean; // Флаг для карточек, ожидающих синхронизации
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

let db: IDBDatabase | null = null;

// Инициализация базы данных
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[IndexedDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      try {
        const database = (event.target as IDBOpenDBRequest).result;

        // Store для карточек
        if (!database.objectStoreNames.contains(STORE_CARDS)) {
          const cardsStore = database.createObjectStore(STORE_CARDS, { keyPath: 'id' });
          cardsStore.createIndex('groupId', 'groupName', { unique: false });
          cardsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store для групп
        if (!database.objectStoreNames.contains(STORE_GROUPS)) {
          database.createObjectStore(STORE_GROUPS, { keyPath: 'name' });
        }

        // Store для статистики
        if (!database.objectStoreNames.contains(STORE_STATISTICS)) {
          database.createObjectStore(STORE_STATISTICS, { keyPath: 'key' });
        }

        // Store для отложенных действий
        if (!database.objectStoreNames.contains(STORE_PENDING)) {
          const pendingStore = database.createObjectStore(STORE_PENDING, { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      } catch (error) {
        console.error('[IndexedDB] Error during upgrade:', error);
        reject(error);
      }
    };
  });
};

// Сохранение карточек
export const saveCards = async (cards: Card[]): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_CARDS], 'readwrite');
  const store = transaction.objectStore(STORE_CARDS);

  const promises = cards.map(card => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
  console.log(`[IndexedDB] Saved ${cards.length} cards`);
};

// Получение всех карточек
export const getCards = async (groupName?: string): Promise<Card[]> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_CARDS], 'readonly');
  const store = transaction.objectStore(STORE_CARDS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      let cards = request.result as Card[];
      if (groupName) {
        cards = cards.filter(card => card.groupName === groupName);
      }
      console.log(`[IndexedDB] Retrieved ${cards.length} cards`);
      resolve(cards);
    };
    request.onerror = () => reject(request.error);
  });
};

// Сохранение одной карточки
export const saveCard = async (card: Card): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_CARDS], 'readwrite');
  const store = transaction.objectStore(STORE_CARDS);

  return new Promise((resolve, reject) => {
    const request = store.put(card);
    request.onsuccess = () => {
      console.log('[IndexedDB] Card saved:', card.id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Удаление карточки
export const deleteCard = async (id: number): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_CARDS], 'readwrite');
  const store = transaction.objectStore(STORE_CARDS);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      console.log('[IndexedDB] Card deleted:', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Сохранение групп
export const saveGroups = async (groups: string[]): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_GROUPS], 'readwrite');
  const store = transaction.objectStore(STORE_GROUPS);

  // Очистить старые группы
  await new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // Сохранить новые группы
  const promises = groups.map(group => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put({ name: group });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
  console.log(`[IndexedDB] Saved ${groups.length} groups`);
};

// Получение групп
export const getGroups = async (): Promise<string[]> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_GROUPS], 'readonly');
  const store = transaction.objectStore(STORE_GROUPS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const groups = request.result.map((item: any) => item.name);
      console.log(`[IndexedDB] Retrieved ${groups.length} groups`);
      resolve(groups);
    };
    request.onerror = () => reject(request.error);
  });
};

// Сохранение статистики
export const saveStatistics = async (stats: any): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_STATISTICS], 'readwrite');
  const store = transaction.objectStore(STORE_STATISTICS);

  return new Promise((resolve, reject) => {
    const request = store.put({ key: 'statistics', ...stats });
    request.onsuccess = () => {
      console.log('[IndexedDB] Statistics saved');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Получение статистики
export const getStatistics = async (): Promise<any | null> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_STATISTICS], 'readonly');
  const store = transaction.objectStore(STORE_STATISTICS);

  return new Promise((resolve, reject) => {
    const request = store.get('statistics');
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const { key, ...stats } = result;
        resolve(stats);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Добавление отложенного действия
export const addPendingAction = async (action: PendingAction): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_PENDING], 'readwrite');
  const store = transaction.objectStore(STORE_PENDING);

  return new Promise((resolve, reject) => {
    const request = store.add(action);
    request.onsuccess = () => {
      console.log('[IndexedDB] Pending action added:', action.id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Получение всех отложенных действий
export const getPendingActions = async (): Promise<PendingAction[]> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_PENDING], 'readonly');
  const store = transaction.objectStore(STORE_PENDING);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const actions = request.result as PendingAction[];
      console.log(`[IndexedDB] Retrieved ${actions.length} pending actions`);
      resolve(actions);
    };
    request.onerror = () => reject(request.error);
  });
};

// Удаление отложенного действия
export const removePendingAction = async (id: string): Promise<void> => {
  const database = await initDB();
  const transaction = database.transaction([STORE_PENDING], 'readwrite');
  const store = transaction.objectStore(STORE_PENDING);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      console.log('[IndexedDB] Pending action removed:', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Проверка наличия IndexedDB
export const isIndexedDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

// Очистка всех данных
export const clearAllData = async (): Promise<void> => {
  const database = await initDB();
  const stores = [STORE_CARDS, STORE_GROUPS, STORE_STATISTICS, STORE_PENDING];
  
  for (const storeName of stores) {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  console.log('[IndexedDB] All data cleared');
};
