'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '../lib/axios-config'

interface Card {
  id: number
  russianWord: string
  englishWord: string
  russianDescription?: string
  englishDescription?: string
}

type PracticeMode = 'due' | 'recent-all' | 'recent-20' | null

export default function PracticePage() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionComplete, setSessionComplete] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(null)
  
  // Swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }
    fetchCardsForReview()
  }, [router])

  // Function to duplicate cards 2-4 times and shuffle
  const prepareCardsForSession = (originalCards: Card[]): Card[] => {
    if (originalCards.length === 0) return []
    
    const duplicated: Card[] = []
    
    // For each card, add it 2-4 times randomly
    originalCards.forEach(card => {
      const repeatCount = Math.floor(Math.random() * 3) + 2 // 2, 3, or 4
      for (let i = 0; i < repeatCount; i++) {
        duplicated.push(card)
      }
    })
    
    // Shuffle the array
    for (let i = duplicated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [duplicated[i], duplicated[j]] = [duplicated[j], duplicated[i]]
    }
    
    return duplicated
  }

  const fetchCardsForReview = async (mode: PracticeMode = 'due') => {
    try {
      setLoading(true)
      setError('')
      console.log('[PRACTICE PAGE] Fetching cards for review, mode:', mode);
      
      let response
      if (mode === 'due') {
        response = await apiClient.get('/api/cards/review', {
          params: { limit: 20 },
        })
      } else if (mode === 'recent-20') {
        response = await apiClient.get('/api/cards/recent', {
          params: { limit: 20 },
        })
      } else {
        // recent-all
        response = await apiClient.get('/api/cards/recent')
      }
      
      console.log('[PRACTICE PAGE] Cards fetched:', response.data);
      
      if (response.data.length === 0) {
        // If mode is 'due' and no cards, show mode selection
        if (mode === 'due') {
          setPracticeMode(null)
          setCards([])
        } else {
          setSessionComplete(true)
          setCards([])
        }
      } else {
        // Duplicate cards 2-4 times and shuffle for better memorization
        const preparedCards = prepareCardsForSession(response.data)
        console.log('[PRACTICE PAGE] Prepared cards count:', preparedCards.length, 'from', response.data.length, 'original cards');
        setCards(preparedCards)
        setCurrentIndex(0)
        setIsFlipped(false)
        setSessionComplete(false)
        setPracticeMode(mode)
      }
    } catch (err: any) {
      console.error('[PRACTICE PAGE] Error fetching cards:', err);
      if (err.response?.status === 401) {
        console.log('[PRACTICE PAGE] Unauthorized, redirecting to auth');
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/auth')
      } else {
        const errorMessage = err.response?.data?.message || 'Ошибка при загрузке карточек';
        console.error('[PRACTICE PAGE] Error message:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (quality: number) => {
    if (cards.length === 0) return

    const currentCard = cards[currentIndex]
    
    // Отправляем review на сервер (не блокируем - карточки могут повторяться в сессии)
    try {
      await apiClient.post('/api/cards/review', {
        cardId: currentCard.id,
        quality,
      });
      console.log('[PRACTICE PAGE] Card reviewed, quality:', quality);
    } catch (err: any) {
      console.error('[PRACTICE PAGE] Error reviewing card:', err);
      // Не показываем ошибку пользователю, просто логируем
    }

    // Просто переходим к следующей карточке (даже если эта уже была в сессии)
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < cards.length) {
      // Move to next card
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
    } else {
      // Session complete
      setSessionComplete(true);
    }
  }

  const handleFlip = () => {
    vibrate(30) // Short vibration on flip
    setIsFlipped(!isFlipped)
  }

  // Vibrate function with fallback
  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch (e) {
        // Vibration API not supported or failed
        console.log('Vibration not supported')
      }
    }
  }

  // Swipe handlers
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.targetTouches[0].clientX
    const distance = currentTouch - touchStart
    setSwipeOffset(distance)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) {
      setSwipeOffset(0)
      return
    }
    
    const touchEndX = e.changedTouches[0].clientX
    const distance = touchEndX - touchStart
    const isLeftSwipe = distance < -minSwipeDistance
    const isRightSwipe = distance > minSwipeDistance

    setSwipeOffset(0)

    if (!isFlipped) {
      // If card is not flipped, just flip it
      if (isLeftSwipe || isRightSwipe) {
        vibrate(30) // Short vibration on flip
        setIsFlipped(true)
      }
    } else {
      // If card is flipped, handle review
      if (isLeftSwipe) {
        // Swipe left = don't know (quality 1) - longer vibration
        vibrate([50, 30, 50])
        handleReview(1)
      } else if (isRightSwipe) {
        // Swipe right = know (quality 4) - short vibration
        vibrate(50)
        handleReview(4)
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (touchStart !== null) return
    e.preventDefault() // Prevent default drag behavior
    setTouchEnd(null)
    setTouchStart(e.clientX)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!touchStart || touchStart === null) return
    e.preventDefault() // Prevent text selection
    const distance = e.clientX - touchStart
    setSwipeOffset(distance)
  }

  const onMouseUp = (e: React.MouseEvent) => {
    if (!touchStart || touchStart === null) return
    
    const distance = e.clientX - touchStart
    const isLeftSwipe = distance < -minSwipeDistance
    const isRightSwipe = distance > minSwipeDistance

    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)

    if (!isFlipped) {
      if (isLeftSwipe || isRightSwipe) {
        vibrate(30) // Short vibration on flip
        setIsFlipped(true)
      }
    } else {
      if (isLeftSwipe) {
        vibrate([50, 30, 50]) // Longer vibration for "don't know"
        handleReview(1)
      } else if (isRightSwipe) {
        vibrate(50) // Short vibration for "know"
        handleReview(4)
      }
    }
  }

  const onMouseLeave = () => {
    // Reset on mouse leave to prevent stuck state
    if (touchStart !== null) {
      setSwipeOffset(0)
      setTouchStart(null)
      setTouchEnd(null)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionComplete(false)
    setPracticeMode(null)
    setCards([])
    // Don't fetch immediately, let user choose mode
  }

  const handleSelectMode = (mode: PracticeMode) => {
    setPracticeMode(mode)
    setSessionComplete(false)
    fetchCardsForReview(mode)
  }

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading && practiceMode === null) {
    // First load - checking for due cards
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card">
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card">
          <p>Загрузка карточек...</p>
        </div>
      </div>
    )
  }

  // Show mode selection if no cards available (only when mode not selected or when explicitly completed)
  if (!loading && practiceMode === null && cards.length === 0) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>
            {sessionComplete ? '🎉 Отлично!' : 'Выберите режим практики'}
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            {sessionComplete 
              ? 'Вы завершили текущую сессию практики. Выберите режим для продолжения:'
              : 'Нет карточек готовых к повторению. Выберите режим практики:'
            }
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => handleSelectMode('due')}
              style={{ width: '100%', padding: '1rem' }}
            >
              Карточки к повторению
            </button>
            <button 
              className="btn" 
              onClick={() => handleSelectMode('recent-20')}
              style={{ width: '100%', padding: '1rem' }}
            >
              Последние 20 карточек
            </button>
            <button 
              className="btn" 
              onClick={() => handleSelectMode('recent-all')}
              style={{ width: '100%', padding: '1rem' }}
            >
              Все последние карточки
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Safety check - if session is complete, show completion screen and reset
  if (sessionComplete) {
    // Reset session state for next time
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>🎉 Отлично!</h1>
          <p style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>
            Вы завершили текущую сессию практики.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setSessionComplete(false)
                setPracticeMode(null)
                setCards([])
                setCurrentIndex(0)
                setIsFlipped(false)
              }}
            >
              Выбрать новый режим
            </button>
            <button className="btn" onClick={() => router.push('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Safety check - if no cards or invalid index
  if (!cards || cards.length === 0 || currentIndex >= cards.length || !cards[currentIndex]) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Карточки не найдены или произошла ошибка</p>
          <button className="btn btn-primary" onClick={() => router.push('/practice')}>
            Попробовать снова
          </button>
          <button className="btn" onClick={() => router.push('/')} style={{ marginTop: '1rem' }}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  return (
    <div className="container practice-container">
      <div className="practice-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="АБОБА" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '50%' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1>Практика</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="practice-counter">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div className="card error-card">
          {error}
        </div>
      )}

      {!isFlipped && (
        <div className="swipe-hint">
          <p>Нажмите на карточку, чтобы перевернуть</p>
        </div>
      )}

      {isFlipped && (
        <div className="swipe-hint">
          <span className="swipe-left-hint">👈 Не знаю</span>
          <span className="swipe-right-hint">Знаю 👉</span>
        </div>
      )}

      <div
        className="card practice-card"
        onClick={handleFlip}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{
          transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.1}deg) scale(${swipeOffset !== 0 ? Math.max(0.95, 1 - Math.abs(swipeOffset) / 500) : 1})`,
          opacity: swipeOffset !== 0 ? Math.max(0.8, 1 - Math.abs(swipeOffset) / 400) : 1,
          borderLeft: swipeOffset > 50 ? '5px solid #4CAF50' : 'none',
          borderRight: swipeOffset < -50 ? '5px solid #f44336' : 'none',
          boxShadow: swipeOffset !== 0 
            ? `0 ${Math.abs(swipeOffset) / 10}px ${Math.abs(swipeOffset) / 5}px rgba(0, 0, 0, 0.2)`
            : '0 8px 24px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front side (Russian) */}
          <div className="card-front">
            <div className="card-label">Русский</div>
            <div className="card-word">{currentCard.russianWord}</div>
            {currentCard.russianDescription && (
              <div className="card-description">{currentCard.russianDescription}</div>
            )}
          </div>

          {/* Back side (English) */}
          <div className="card-back" style={{ transform: 'rotateY(180deg)' }}>
            <div className="card-label">English</div>
            <div className="card-word">{currentCard.englishWord}</div>
            {currentCard.englishDescription && (
              <div className="card-description">{currentCard.englishDescription}</div>
            )}
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="practice-buttons">
          <button
            className="btn btn-danger"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card flip
              vibrate([50, 30, 50]);
              handleReview(1);
            }}
          >
            👈 Не знаю
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card flip
              vibrate(50);
              handleReview(4);
            }}
          >
            Знаю 👉
          </button>
        </div>
      )}

      {/* Footer with home button */}
      <div className="practice-footer">
        <button 
          className="btn btn-secondary" 
          onClick={handleGoHome}
          style={{ width: '100%', padding: '1rem' }}
        >
          Главная
        </button>
      </div>

    </div>
  )
}

