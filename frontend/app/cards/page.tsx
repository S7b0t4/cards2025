'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import apiClient from '../lib/axios-config'
import styles from './cards.module.css'

interface Card {
  id: number
  russianWord: string
  englishWord: string
  russianDescription?: string
  englishDescription?: string
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
  const [formData, setFormData] = useState({
    russianWord: '',
    englishWord: '',
    russianDescription: '',
    englishDescription: '',
  })
  // Swipe state for each card
  const [swipeStates, setSwipeStates] = useState<Record<number, { touchStart: number | null; swipeOffset: number }>>({})

  const fetchCards = async () => {
    try {
      console.log('[CARDS PAGE] Fetching cards...');
      const response = await apiClient.get('/api/cards');
      console.log('[CARDS PAGE] Cards fetched successfully:', response.data);
      setCards(response.data);
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
    }
  }

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth')
        return
      }
      // Check if we should open form from URL parameter
      const shouldOpenForm = searchParams?.get('new') === 'true'
      if (shouldOpenForm) {
        setShowForm(true)
      }
      fetchCards()
    } catch (err) {
      console.error('[CARDS PAGE] Error in useEffect:', err)
      setError('Произошла ошибка при загрузке страницы')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cardData = {
      russianWord: formData.russianWord.trim(),
      englishWord: formData.englishWord.trim(),
      russianDescription: formData.russianDescription.trim() || undefined,
      englishDescription: formData.englishDescription.trim() || undefined,
    };

    console.log('[CARDS PAGE] Creating card:', cardData);

    try {
      const response = await apiClient.post('/api/cards', cardData);
      console.log('[CARDS PAGE] Card created successfully:', response.data);

      setFormData({
        russianWord: '',
        englishWord: '',
        russianDescription: '',
        englishDescription: '',
      })
      setShowForm(false)
      setShowDescriptions(false)
      router.push('/cards')
      fetchCards()
    } catch (err: any) {
      console.error('[CARDS PAGE] Error creating card:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при создании карточки';
      console.error('[CARDS PAGE] Error message:', errorMessage);
      setError(errorMessage);
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту карточку?')) return

    console.log('[CARDS PAGE] Deleting card:', id);

    try {
      await apiClient.delete(`/api/cards/${id}`);
      console.log('[CARDS PAGE] Card deleted successfully');
      fetchCards();
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

    const cardData = {
      russianWord: formData.russianWord.trim(),
      englishWord: formData.englishWord.trim(),
      russianDescription: formData.russianDescription.trim() || undefined,
      englishDescription: formData.englishDescription.trim() || undefined,
    };

    console.log('[CARDS PAGE] Updating card:', editingCard.id, cardData);

    try {
      await apiClient.patch(`/api/cards/${editingCard.id}`, cardData);
      console.log('[CARDS PAGE] Card updated successfully');
      setEditingCard(null)
      setFormData({
        russianWord: '',
        englishWord: '',
        russianDescription: '',
        englishDescription: '',
      })
      setShowDescriptions(false)
      fetchCards()
    } catch (err: any) {
      console.error('[CARDS PAGE] Error updating card:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при обновлении карточки';
      setError(errorMessage);
    }
  }

  const startEdit = (card: Card) => {
    setEditingCard(card)
    setFormData({
      russianWord: card.russianWord,
      englishWord: card.englishWord,
      russianDescription: card.russianDescription || '',
      englishDescription: card.englishDescription || '',
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
      const card = cards.find(c => c.id === cardId)
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
      const card = cards.find(c => c.id === cardId)
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
      <div className={styles.cardsContent}>
      {error && (
        <div className="card" style={{ background: '#fee', color: '#c00', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {(showForm || editingCard) && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>{editingCard ? 'Редактировать карточку' : 'Создать новую карточку'}</h2>
          <form onSubmit={editingCard ? handleUpdate : handleSubmit}>
            <div className="form-group">
              <label htmlFor="russianWord">Русское слово *</label>
              <input
                type="text"
                id="russianWord"
                value={formData.russianWord}
                onChange={(e) => setFormData({ ...formData, russianWord: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="englishWord">English word *</label>
              <input
                type="text"
                id="englishWord"
                value={formData.englishWord}
                onChange={(e) => setFormData({ ...formData, englishWord: e.target.value })}
                required
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingCard ? 'Сохранить' : 'Создать'}
              </button>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false)
                setEditingCard(null)
                setShowDescriptions(false)
                setFormData({
                  russianWord: '',
                  englishWord: '',
                  russianDescription: '',
                  englishDescription: '',
                })
                router.push('/cards')
              }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card">
          <p>У вас пока нет карточек. Создайте первую!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
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
      </div>

      {/* Header moved to bottom for easier access */}
      <div className={styles.cardsHeader}>
        <div className={styles.cardsHeaderContent}>
          <button className={`btn btn-secondary ${styles.cardsBackButton}`} onClick={() => router.push('/')}>
            ←<span className={styles.cardsBackButtonText}> На главную</span>
          </button>
          <div className={styles.cardsTitleWrapper}>
            <img src="/logo.png" alt="АБОБА" className={styles.cardsLogo} onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <h1 className={styles.cardsTitle}>Мои карточки</h1>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
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

