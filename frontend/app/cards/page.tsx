'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import apiClient from '../lib/axios-config'
import { initDB, getCardsOffline, createCardOffline, updateCardOffline, deleteCardOffline, syncCards, onOnlineStatusChange } from '../lib/offline-sync'
import styles from './cards.module.css'

interface Card {
  id: number
  russianWord: string
  englishWord: string
  russianDescription?: string
  englishDescription?: string
  groupName?: string
  createdAt: string
}

function CardsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('Мои карточки')
  const [groups, setGroups] = useState<string[]>(['Мои карточки'])
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCards, setTotalCards] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(0)
  const cardsContainerRef = useRef<HTMLDivElement | null>(null)
  const [formData, setFormData] = useState({
    russianWord: '',
    englishWord: '',
    russianDescription: '',
    englishDescription: '',
    groupName: 'Мои карточки',
  })
  // Swipe state for each card
  const [swipeStates, setSwipeStates] = useState<Record<number, { touchStart: number | null; swipeOffset: number }>>({})
  // Ref for English input to focus on form open
  const englishInputRef = useRef<HTMLInputElement | null>(null)
  // Ref for Russian input to focus after card creation
  const russianInputRef = useRef<HTMLInputElement | null>(null)

  const fetchCards = async (group?: string, reset: boolean = true) => {
    try {
      if (reset) {
        setLoading(true);
        setCards([]);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      console.log('[CARDS PAGE] Fetching cards...', group ? `Group: ${group}` : 'All groups', reset ? '(reset)' : '(load more)');
      
      // Используем офлайн-функцию для получения карточек
      const allCards = await getCardsOffline(group);
      
      // Применяем пагинацию
      const offset = reset ? 0 : currentOffset;
      const limit = 10;
      const newCards = allCards.slice(offset, offset + limit);
      const total = allCards.length;
      
      if (reset) {
        setCards(newCards);
        setCurrentOffset(newCards.length);
        setHasMore(newCards.length < total);
      } else {
        setCards(prev => {
          const updated = [...prev, ...newCards];
          setCurrentOffset(updated.length);
          setHasMore(updated.length < total);
          return updated;
        });
      }
      
      setTotalCards(total);
    } catch (err: any) {
      console.error('[CARDS PAGE] Error fetching cards:', err);
      if (err.response?.status === 401) {
        console.log('[CARDS PAGE] Unauthorized, redirecting to auth');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth');
        return;
      } else {
        const errorMessage = err.response?.data?.message || 'Ошибка при загрузке карточек';
        console.error('[CARDS PAGE] Error message:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const loadMoreCards = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchCards(selectedGroup, false);
    }
  }, [selectedGroup, loadingMore, hasMore, loading])

  const fetchGroups = async () => {
    try {
      const response = await apiClient.get('/api/cards/groups');
      console.log('[CARDS PAGE] Groups fetched:', response.data);
      if (response.data && response.data.length > 0) {
        setGroups(response.data);
        if (!response.data.includes(selectedGroup)) {
          setSelectedGroup(response.data[0]);
        }
      }
    } catch (err: any) {
      console.error('[CARDS PAGE] Error fetching groups:', err);
    }
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/auth')
          return
        }
        
        // Инициализируем IndexedDB (не блокируем загрузку)
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          try {
            await initDB()
            console.log('[CARDS PAGE] IndexedDB initialized')
          } catch (dbError) {
            console.error('[CARDS PAGE] IndexedDB init error:', dbError)
            // Продолжаем работу даже если IndexedDB не инициализировался
          }
        }
        
        // Синхронизируем данные при загрузке (не блокируем)
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          syncCards().catch((err) => {
            console.log('[CARDS PAGE] Sync failed, using cached data:', err)
          })
        }
        
        // Check if we should open form from URL parameter
        const shouldOpenForm = searchParams?.get('new') === 'true'
        if (shouldOpenForm) {
          setShowForm(true)
        }
        
        // Загружаем группы и карточки
        fetchGroups().then(() => {
          fetchCards(selectedGroup)
        })
      } catch (err) {
        console.error('[CARDS PAGE] Error in useEffect:', err)
        setError('Произошла ошибка при загрузке страницы')
        setLoading(false)
      }
    }
    
    initialize()
    
    // Слушаем изменения онлайн статуса для синхронизации
    const cleanup = onOnlineStatusChange(async (isOnline) => {
      if (isOnline && typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          await syncCards()
          fetchCards(selectedGroup, true)
        } catch (err) {
          console.error('[CARDS PAGE] Sync error:', err)
        }
      }
    })
    
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      fetchCards(selectedGroup, true)
    }
  }, [selectedGroup])

  // Infinite scroll handler
  useEffect(() => {
    const container = cardsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Загружаем больше когда доскроллили до 200px от низа
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !loadingMore && !loading) {
        loadMoreCards();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, loadMoreCards])

  // Focus input when form opens
  useEffect(() => {
    if (editingCard && englishInputRef.current) {
      // When editing, focus English input
      setTimeout(() => {
        englishInputRef.current?.focus()
      }, 100)
    } else if (showForm && russianInputRef.current) {
      // When creating new card, focus Russian input
      setTimeout(() => {
        russianInputRef.current?.focus()
      }, 100)
    }
  }, [showForm, editingCard])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const cardData = {
      russianWord: formData.russianWord.trim(),
      englishWord: formData.englishWord.trim(),
      russianDescription: formData.russianDescription.trim() || undefined,
      englishDescription: formData.englishDescription.trim() || undefined,
      groupName: formData.groupName.trim() || undefined,
    };

    console.log('[CARDS PAGE] Creating card:', cardData);

    try {
      // Используем офлайн-функцию для создания карточки
      const newCard = await createCardOffline(cardData);
      console.log('[CARDS PAGE] Card created successfully:', newCard);

      // Clear form data but keep form open
      setFormData({
        russianWord: '',
        englishWord: '',
        russianDescription: '',
        englishDescription: '',
        groupName: selectedGroup,
      })
      setShowDescriptions(false)
      
      // Show success toast
      setToastMessage(newCard._offline ? 'Карточка добавлена (офлайн)!' : 'Карточка добавлена!')
      setTimeout(() => setToastMessage(null), 3000)
      
      // Refresh cards list (reset to first page)
      fetchCards(selectedGroup, true)
      
      // Focus on Russian input for next card
      setTimeout(() => {
        russianInputRef.current?.focus()
      }, 100)
    } catch (err: any) {
      console.error('[CARDS PAGE] Error creating card:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при создании карточки';
      console.error('[CARDS PAGE] Error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту карточку?')) return

    console.log('[CARDS PAGE] Deleting card:', id);

    try {
      // Используем офлайн-функцию для удаления карточки
      await deleteCardOffline(id);
      console.log('[CARDS PAGE] Card deleted successfully');
      fetchCards(selectedGroup, true);
    } catch (err: any) {
      console.error('[CARDS PAGE] Error deleting card:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при удалении карточки';
      setError(errorMessage);
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    if (!editingCard) return
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const cardData = {
      russianWord: formData.russianWord.trim(),
      englishWord: formData.englishWord.trim(),
      russianDescription: formData.russianDescription.trim() || undefined,
      englishDescription: formData.englishDescription.trim() || undefined,
      groupName: formData.groupName.trim() || undefined,
    };

    console.log('[CARDS PAGE] Updating card:', editingCard.id, cardData);

    try {
      // Используем офлайн-функцию для обновления карточки
      await updateCardOffline(editingCard.id, cardData);
      console.log('[CARDS PAGE] Card updated successfully');
      
      setEditingCard(null)
      setFormData({
        russianWord: '',
        englishWord: '',
        russianDescription: '',
        englishDescription: '',
        groupName: selectedGroup,
      })
      setShowDescriptions(false)
      
      // Show success toast
      setToastMessage('Карточка обновлена!')
      setTimeout(() => setToastMessage(null), 3000)
      
      // Refresh cards list (reset to first page)
      fetchCards(selectedGroup, true)
    } catch (err: any) {
      console.error('[CARDS PAGE] Error updating card:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при обновлении карточки';
      setError(errorMessage);
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (card: Card) => {
    setEditingCard(card)
      setFormData({
        russianWord: card.russianWord,
        englishWord: card.englishWord,
        russianDescription: card.russianDescription || '',
        englishDescription: card.englishDescription || '',
        groupName: card.groupName || 'Мои карточки',
      })
    setShowDescriptions(card.russianDescription !== undefined || card.englishDescription !== undefined)
    setShowForm(false)
  }

  // Swipe handlers
  const minSwipeDistance = 100

  const onTouchStart = (cardId: number, e: React.TouchEvent) => {
    setSwipeStates(prev => ({
      ...prev,
      [cardId]: {
        touchStart: e.targetTouches[0].clientX,
        swipeOffset: prev[cardId]?.swipeOffset || 0
      }
    }))
  }

  const onTouchMove = (cardId: number, e: React.TouchEvent) => {
    const state = swipeStates[cardId]
    if (!state || state.touchStart === null) return
    
    const currentTouch = e.targetTouches[0].clientX
    const distance = currentTouch - state.touchStart
    
    setSwipeStates(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        swipeOffset: distance
      }
    }))
  }

  const onTouchEnd = (cardId: number, e: React.TouchEvent) => {
    const state = swipeStates[cardId]
    if (!state || state.touchStart === null) {
      setSwipeStates(prev => ({
        ...prev,
        [cardId]: { touchStart: null, swipeOffset: 0 }
      }))
      return
    }
    
    const touchEndX = e.changedTouches[0].clientX
    const distance = touchEndX - state.touchStart
    const isRightSwipe = distance > minSwipeDistance
    const isLeftSwipe = distance < -minSwipeDistance

    setSwipeStates(prev => ({
      ...prev,
      [cardId]: { touchStart: null, swipeOffset: 0 }
    }))

    if (isRightSwipe) {
      // Swipe right = delete
      handleDelete(cardId)
    } else if (isLeftSwipe) {
      // Swipe left = edit
      const card = Array.isArray(cards) ? cards.find(c => c.id === cardId) : null
      if (card) {
        startEdit(card)
      }
    }
  }

  const onMouseDown = (cardId: number, e: React.MouseEvent) => {
    e.preventDefault()
    setSwipeStates(prev => ({
      ...prev,
      [cardId]: {
        touchStart: e.clientX,
        swipeOffset: prev[cardId]?.swipeOffset || 0
      }
    }))
  }

  const onMouseMove = (cardId: number, e: React.MouseEvent) => {
    const state = swipeStates[cardId]
    if (!state || state.touchStart === null) return
    e.preventDefault()
    
    const distance = e.clientX - state.touchStart
    
    setSwipeStates(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        swipeOffset: distance
      }
    }))
  }

  const onMouseUp = (cardId: number, e: React.MouseEvent) => {
    const state = swipeStates[cardId]
    if (!state || state.touchStart === null) {
      setSwipeStates(prev => ({
        ...prev,
        [cardId]: { touchStart: null, swipeOffset: 0 }
      }))
      return
    }
    
    const distance = e.clientX - state.touchStart
    const isRightSwipe = distance > minSwipeDistance
    const isLeftSwipe = distance < -minSwipeDistance

    setSwipeStates(prev => ({
      ...prev,
      [cardId]: { touchStart: null, swipeOffset: 0 }
    }))

    if (isRightSwipe) {
      handleDelete(cardId)
    } else if (isLeftSwipe) {
      const card = Array.isArray(cards) ? cards.find(c => c.id === cardId) : null
      if (card) {
        startEdit(card)
      }
    }
  }

  const onMouseLeave = (cardId: number) => {
    setSwipeStates(prev => ({
      ...prev,
      [cardId]: { touchStart: null, swipeOffset: 0 }
    }))
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`container ${styles.cardsContainer}`}>
      {toastMessage && (
        <div className={styles.toast}>
          <span className={styles.toastIcon}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
      <div className={styles.cardsContent} ref={cardsContainerRef}>
      {error && (
        <div className="card" style={{ background: '#fee', color: '#c00', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {(showForm || editingCard) && (
        <div className="card" style={{ marginBottom: '2rem', position: 'relative' }}>
          <h2 style={{ marginBottom: '1rem' }}>{editingCard ? 'Редактировать карточку' : 'Создать новую карточку'}</h2>
          {submitting && (
            <div className={styles.formLoadingOverlay}>
              <div className={styles.formLoadingSpinner}></div>
            </div>
          )}
          <form onSubmit={editingCard ? handleUpdate : handleSubmit} style={{ opacity: submitting ? 0.6 : 1, pointerEvents: submitting ? 'none' : 'auto' }}>
            <div className="form-group">
              <label htmlFor="groupName">Группа</label>
              <select
                id="groupName"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  minHeight: '48px',
                }}
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Или введите новую группу..."
                value={formData.groupName && !groups.includes(formData.groupName) ? formData.groupName : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, groupName: e.target.value })
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  marginTop: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  minHeight: '44px',
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="englishWord">English word *</label>
              <input
                type="text"
                id="englishWord"
                ref={englishInputRef}
                value={formData.englishWord}
                onChange={(e) => setFormData({ ...formData, englishWord: e.target.value })}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  minHeight: '52px',
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="russianWord">Русское слово *</label>
              <input
                type="text"
                id="russianWord"
                ref={russianInputRef}
                value={formData.russianWord}
                onChange={(e) => setFormData({ ...formData, russianWord: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  minHeight: '52px',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowDescriptions(!showDescriptions)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                }}
              >
                {showDescriptions ? '▼ Скрыть описания' : '▶ Показать описания (необязательно)'}
              </button>
            </div>

            {showDescriptions && (
              <>
                <div className="form-group">
                  <label htmlFor="russianDescription">Русское описание</label>
                  <textarea
                    id="russianDescription"
                    value={formData.russianDescription}
                    onChange={(e) => setFormData({ ...formData, russianDescription: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="englishDescription">English description</label>
                  <textarea
                    id="englishDescription"
                    value={formData.englishDescription}
                    onChange={(e) => setFormData({ ...formData, englishDescription: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '0.75rem',
              flexDirection: 'column',
            }}>
              <button 
                type="submit" 
                className={`btn btn-primary ${styles.cardsFormButton}`}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  minHeight: '56px',
                  borderRadius: '12px',
                  position: 'relative',
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? (
                  <>
                    <span className={styles.loadingSpinner} style={{ marginRight: '0.5rem' }}></span>
                    Сохранение...
                  </>
                ) : (
                  editingCard ? 'Сохранить' : 'Создать'
                )}
              </button>
              <button 
                type="button" 
                className={`btn ${styles.cardsFormButton}`} 
                onClick={() => {
                  setShowForm(false)
                  setEditingCard(null)
                  setShowDescriptions(false)
                  setFormData({
                    russianWord: '',
                    englishWord: '',
                    russianDescription: '',
                    englishDescription: '',
                    groupName: selectedGroup,
                  })
                  router.push('/cards')
                }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  minHeight: '48px',
                  borderRadius: '12px',
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {!Array.isArray(cards) || cards.length === 0 ? (
        <div className="card">
          <p>У вас пока нет карточек. Создайте первую!</p>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {cards.map((card) => {
            const swipeState = swipeStates[card.id] || { touchStart: null, swipeOffset: 0 }
            const swipeOffset = swipeState.swipeOffset
            const isRightSwipe = swipeOffset > 50
            const isLeftSwipe = swipeOffset < -50
            
            // Determine background color based on swipe direction
            let backgroundColor = 'var(--bg-secondary)'
            let borderColor = 'var(--border-color)'
            if (isRightSwipe) {
              backgroundColor = '#fee' // Red for delete
              borderColor = '#f44336'
            } else if (isLeftSwipe) {
              backgroundColor = '#fff4e6' // Orange for edit
              borderColor = '#ff9800'
            }

            return (
              <div
                key={card.id}
                className="card"
                style={{
                  position: 'relative',
                  transform: `translateX(${swipeOffset}px)`,
                  backgroundColor,
                  borderColor,
                  borderWidth: (isRightSwipe || isLeftSwipe) ? '2px' : '1px',
                  transition: swipeState.touchStart === null ? 'transform 0.2s, background-color 0.2s, border-color 0.2s' : 'none',
                  touchAction: 'pan-y',
                  userSelect: 'none',
                }}
                onTouchStart={(e) => onTouchStart(card.id, e)}
                onTouchMove={(e) => onTouchMove(card.id, e)}
                onTouchEnd={(e) => onTouchEnd(card.id, e)}
                onMouseDown={(e) => onMouseDown(card.id, e)}
                onMouseMove={(e) => onMouseMove(card.id, e)}
                onMouseUp={(e) => onMouseUp(card.id, e)}
                onMouseLeave={() => onMouseLeave(card.id)}
              >
                {/* Desktop buttons */}
                <div className={styles.desktopCardButtons} style={{ 
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  gap: '0.5rem',
                  zIndex: 10
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(card)
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      background: '#fff4e6',
                      color: '#d97706',
                      border: '1px solid #d97706',
                    }}
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(card.id)
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      background: '#fee',
                      color: '#c00',
                      border: '1px solid #c00',
                    }}
                    title="Удалить"
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {card.russianWord}
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '0.5rem' }}>
                    {card.englishWord}
                  </div>
                  {card.russianDescription && (
                    <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>
                      {card.russianDescription}
                    </div>
                  )}
                  {card.englishDescription && (
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {card.englishDescription}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loadingMore && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '2rem',
          gap: '0.75rem'
        }}>
          <div className={styles.loadingSpinner} style={{ 
            width: '24px', 
            height: '24px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea'
          }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Загрузка карточек...</span>
        </div>
      )}

      {!hasMore && cards.length > 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '1.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Все карточки загружены ({cards.length} из {totalCards})
        </div>
      )}
      </div>

      {/* Header moved to bottom for easier access */}
      <div className={styles.cardsHeader}>
        <div className={styles.cardsHeaderContent}>
          <button className={`btn btn-secondary ${styles.cardsBackButton}`} onClick={() => router.push('/')}>
            ←<span className={styles.cardsBackButtonText}> На главную</span>
          </button>
          <div className={styles.cardsTitleWrapper} style={{ flex: 1, minWidth: 0 }}>
            <img src="/logo.png" alt="АБОБА" className={styles.cardsLogo} onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '120px',
                maxWidth: '100%',
              }}
            >
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className={`btn btn-primary ${styles.cardsNewButton}`} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Новая'}
        </button>
      </div>
    </div>
  )
}

export default function CardsPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card">
          <p>Загрузка...</p>
        </div>
      </div>
    }>
      <CardsPageContent />
    </Suspense>
  )
}

