// Offline synchronization utilities

import apiClient from './axios-config';
import * as db from './indexeddb';
import { isIndexedDBAvailable } from './indexeddb';

interface Card {
  id: number;
  russianWord: string;
  englishWord: string;
  russianDescription?: string;
  englishDescription?: string;
  groupName?: string;
  createdAt: string;
  updatedAt?: string;
  _offline?: boolean;
  _pendingSync?: boolean;
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

// Проверка онлайн/офлайн статуса
export const isOnline = (): boolean => {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
};

// Слушатель изменений онлайн статуса
export const onOnlineStatusChange = (callback: (isOnline: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Синхронизация отложенных действий
export const syncPendingActions = async (): Promise<void> => {
  if (!isOnline()) {
    console.log('[SYNC] Offline, skipping sync');
    return;
  }

  try {
    const pendingActions = await db.getPendingActions();
    console.log(`[SYNC] Found ${pendingActions.length} pending actions`);

    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case 'create': {
            const response = await apiClient.post('/api/cards', action.data);
            const serverCard = response.data;
            console.log('[SYNC] Created card on server:', serverCard.id);
            
            // Удаляем временную карточку из IndexedDB (если есть)
            const allCards = await db.getCards();
            const tempCard = allCards.find(c => 
              c._offline === true && 
              c.russianWord === action.data.russianWord &&
              c.englishWord === action.data.englishWord
            );
            if (tempCard) {
              await db.deleteCard(tempCard.id);
              console.log('[SYNC] Removed temporary card:', tempCard.id);
            }
            
            // Сохраняем карточку с реальным ID
            await db.saveCard(serverCard);
            console.log('[SYNC] Saved synced card:', serverCard.id);
            break;
          }
          case 'update': {
            await apiClient.patch(`/api/cards/${action.data.id}`, action.data);
            console.log('[SYNC] Updated card:', action.data.id);
            
            // Обновляем карточку в IndexedDB
            const allCards = await db.getCards();
            const existingCard = allCards.find(c => c.id === action.data.id);
            if (existingCard) {
              await db.saveCard({
                ...existingCard,
                ...action.data,
                _pendingSync: false,
              });
            }
            break;
          }
          case 'delete': {
            await apiClient.delete(`/api/cards/${action.data.id}`);
            console.log('[SYNC] Deleted card:', action.data.id);
            
            // Удаление из IndexedDB уже произошло при локальном удалении
            break;
          }
        }
        await db.removePendingAction(action.id);
      } catch (error: any) {
        console.error(`[SYNC] Failed to sync action ${action.id}:`, error);
        // Если ошибка не связана с сетью, удаляем действие
        if (error.code !== 'NETWORK_ERROR' && error.message !== 'Network Error') {
          await db.removePendingAction(action.id);
        }
      }
    }
  } catch (error) {
    console.error('[SYNC] Error syncing pending actions:', error);
  }
};

// Синхронизация карточек с сервером
export const syncCards = async (): Promise<void> => {
  if (!isOnline()) {
    console.log('[SYNC] Offline, using cached cards');
    return;
  }

  if (!isIndexedDBAvailable()) {
    console.log('[SYNC] IndexedDB not available, skipping sync');
    return;
  }

  try {
    // Сначала синхронизируем отложенные действия
    // Это важно, чтобы новые карточки появились на сервере
    await syncPendingActions();

    // Затем получаем все карточки с сервера
    const response = await apiClient.get('/api/cards');
    const serverCards = response.data.cards || response.data;

    // Сохраняем в IndexedDB только если это массив
    if (Array.isArray(serverCards)) {
      // Удаляем временные карточки перед сохранением
      const allCards = await db.getCards();
      const tempCards = allCards.filter(c => c._offline === true);
      
      for (const tempCard of tempCards) {
        // Проверяем, есть ли эта карточка на сервере (по содержимому)
        const existsOnServer = serverCards.some(sc => 
          sc.russianWord === tempCard.russianWord &&
          sc.englishWord === tempCard.englishWord
        );
        
        if (existsOnServer) {
          // Если карточка уже на сервере, удаляем временную
          await db.deleteCard(tempCard.id);
          console.log('[SYNC] Removed duplicate temp card:', tempCard.id);
        }
      }
      
      // Сохраняем/обновляем все карточки с сервера
      await db.saveCards(serverCards);
    }

    console.log('[SYNC] Cards synced successfully');
  } catch (error: any) {
    console.error('[SYNC] Error syncing cards:', error);
    // Не пробрасываем ошибку, чтобы не блокировать работу
  }
};

// Создание карточки с офлайн-поддержкой
export const createCardOffline = async (cardData: Omit<Card, 'id' | 'createdAt'>): Promise<Card> => {
  const newCard: Card = {
    ...cardData,
    id: Date.now(), // Временный ID
    createdAt: new Date().toISOString(),
    _offline: true,
    _pendingSync: true,
  };

  // Сохраняем в IndexedDB
  await db.saveCard(newCard);

  if (isOnline()) {
    try {
      // Пытаемся создать на сервере
      const response = await apiClient.post('/api/cards', cardData);
      const serverCard = response.data;

      // Обновляем карточку в IndexedDB с реальным ID
      await db.deleteCard(newCard.id);
      await db.saveCard(serverCard);

      return serverCard;
    } catch (error: any) {
      // Если не удалось, добавляем в очередь синхронизации
      const pendingAction: PendingAction = {
        id: `create-${Date.now()}`,
        type: 'create',
        data: cardData,
        timestamp: Date.now(),
      };
      await db.addPendingAction(pendingAction);
      throw error;
    }
  } else {
    // Офлайн режим - добавляем в очередь
    const pendingAction: PendingAction = {
      id: `create-${Date.now()}`,
      type: 'create',
      data: cardData,
      timestamp: Date.now(),
    };
    await db.addPendingAction(pendingAction);
  }

  return newCard;
};

// Обновление карточки с офлайн-поддержкой
export const updateCardOffline = async (id: number, cardData: Partial<Card>): Promise<void> => {
  // Обновляем в IndexedDB
  const existingCard = (await db.getCards()).find(c => c.id === id);
  if (existingCard) {
    const updatedCard = {
      ...existingCard,
      ...cardData,
      updatedAt: new Date().toISOString(),
      _pendingSync: true,
    };
    await db.saveCard(updatedCard);
  }

  if (isOnline()) {
    try {
      await apiClient.patch(`/api/cards/${id}`, cardData);
    } catch (error: any) {
      // Если не удалось, добавляем в очередь
      const pendingAction: PendingAction = {
        id: `update-${id}-${Date.now()}`,
        type: 'update',
        data: { id, ...cardData },
        timestamp: Date.now(),
      };
      await db.addPendingAction(pendingAction);
      throw error;
    }
  } else {
    // Офлайн режим - добавляем в очередь
    const pendingAction: PendingAction = {
      id: `update-${id}-${Date.now()}`,
      type: 'update',
      data: { id, ...cardData },
      timestamp: Date.now(),
    };
    await db.addPendingAction(pendingAction);
  }
};

// Удаление карточки с офлайн-поддержкой
export const deleteCardOffline = async (id: number): Promise<void> => {
  // Удаляем из IndexedDB
  await db.deleteCard(id);

  if (isOnline()) {
    try {
      await apiClient.delete(`/api/cards/${id}`);
    } catch (error: any) {
      // Если не удалось, добавляем в очередь
      const pendingAction: PendingAction = {
        id: `delete-${id}-${Date.now()}`,
        type: 'delete',
        data: { id },
        timestamp: Date.now(),
      };
      await db.addPendingAction(pendingAction);
      throw error;
    }
  } else {
    // Офлайн режим - добавляем в очередь
    const pendingAction: PendingAction = {
      id: `delete-${id}-${Date.now()}`,
      type: 'delete',
      data: { id },
      timestamp: Date.now(),
    };
    await db.addPendingAction(pendingAction);
  }
};

// Получение карточек с офлайн-поддержкой
export const getCardsOffline = async (groupName?: string): Promise<Card[]> => {
  if (isOnline()) {
    try {
      // Пытаемся получить с сервера
      const url = groupName ? `/api/cards?group=${encodeURIComponent(groupName)}` : '/api/cards';
      const response = await apiClient.get(url);
      const serverCards = response.data.cards || response.data;

      // Сохраняем в IndexedDB
      if (Array.isArray(serverCards)) {
        await db.saveCards(serverCards);
        return serverCards;
      } else {
        // Если ответ не массив, используем кеш
        return await db.getCards(groupName);
      }
    } catch (error: any) {
      console.log('[OFFLINE] Failed to fetch from server, using cache');
      // Если не удалось, используем кеш
      return await db.getCards(groupName);
    }
  } else {
    // Офлайн режим - используем кеш
    return await db.getCards(groupName);
  }
};
