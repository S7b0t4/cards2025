'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
type InputMode = 'swipe' | 'typing'

export default function PracticePage() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionComplete, setSessionComplete] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(null)
  const [inputMode, setInputMode] = useState<InputMode>(() => {
    // Загружаем сохраненный режим из localStorage
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('practiceInputMode') as InputMode
      if (savedMode === 'swipe' || savedMode === 'typing') {
        return savedMode
      }
    }
    return 'swipe'
  })

  // Typing mode state
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswerResult, setShowAnswerResult] = useState(false)
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Function to duplicate cards 2 times max and shuffle (optimized for memory)
  const prepareCardsForSession = useCallback((originalCards: Card[]): Card[] => {
    if (originalCards.length === 0) return []

    // Limit total cards to prevent memory issues on low-end devices
    const MAX_CARDS = 50
    const MAX_DUPLICATION = 2 // Reduced from 2-4 to save memory

    const duplicated: Card[] = []

    // For each card, add it max 2 times (reduced from 2-4)
    originalCards.forEach(card => {
      const repeatCount = Math.min(MAX_DUPLICATION, Math.floor(Math.random() * 2) + 1) // 1 or 2
      for (let i = 0; i < repeatCount; i++) {
        duplicated.push(card)
        // Early exit if we hit the limit
        if (duplicated.length >= MAX_CARDS) break
      }
      if (duplicated.length >= MAX_CARDS) return
    })

    // Limit to MAX_CARDS if exceeded
    const limited = duplicated.slice(0, MAX_CARDS)

    // Shuffle the array (optimized Fisher-Yates)
    for (let i = limited.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [limited[i], limited[j]] = [limited[j], limited[i]]
    }

    return limited
  }, [])

  const fetchCardsForReview = useCallback(async (mode: PracticeMode = 'due') => {
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
        // Duplicate cards max 2 times and shuffle for better memorization (memory optimized)
        const preparedCards = prepareCardsForSession(response.data)
        console.log('[PRACTICE PAGE] Prepared cards count:', preparedCards.length, 'from', response.data.length, 'original cards');
        setCards(preparedCards)
        setCurrentIndex(0)
        setIsFlipped(false)
        setIsExiting(false)
        setExitDirection(null)
        setSessionComplete(false)
        setPracticeMode(mode)
        // Reset typing mode state
        setUserAnswer('')
        setShowAnswerResult(false)
        setIsAnswerCorrect(false)
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
  }, [router, prepareCardsForSession])

  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)

  const handleReview = async (quality: number) => {
    if (cards.length === 0 || isExiting) return

    const currentCard = cards[currentIndex]

    // Set exit animation
    const direction = quality === 1 ? 'left' : 'right'
    setIsExiting(true)
    setExitDirection(direction)

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

    // Wait for exit animation, then move to next card
    setTimeout(() => {
      const nextIndex = currentIndex + 1;

      if (nextIndex < cards.length) {
        // Reset ALL state synchronously before changing index to prevent flash
        setIsFlipped(false)
        setIsExiting(false)
        setExitDirection(null)
        // Change index immediately after state reset
        setCurrentIndex(nextIndex);
      } else {
        // Session complete
        setSessionComplete(true);
        setIsExiting(false)
        setExitDirection(null)
      }
    }, 400) // Match animation duration
  }

  const handleFlip = () => {
    if (inputMode === 'typing') return // Disable flip in typing mode
    vibrate(30) // Short vibration on flip
    setIsFlipped(!isFlipped)
  }

  const handleAnswerSubmit = useCallback(() => {
    if (!userAnswer.trim()) return

    const currentCard = cards[currentIndex]
    const correctAnswer = currentCard.englishWord.toLowerCase().trim()
    const userAnswerLower = userAnswer.toLowerCase().trim()
    const isCorrect = correctAnswer === userAnswerLower

    setIsAnswerCorrect(isCorrect)
    setShowAnswerResult(true)

    if (isCorrect) {
      vibrate(50)
    } else {
      vibrate([50, 30, 50])
    }
  }, [userAnswer, currentIndex, cards])

  const handleAnswerNext = useCallback(async () => {
    if (!showAnswerResult) return

    const currentCard = cards[currentIndex]
    const quality = isAnswerCorrect ? 4 : 1

    // Send review to server
    try {
      await apiClient.post('/api/cards/review', {
        cardId: currentCard.id,
        quality,
      });
    } catch (err: any) {
      console.error('[PRACTICE PAGE] Error reviewing card:', err);
    }

    // Move to next card
    const nextIndex = currentIndex + 1;

    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
      setUserAnswer('')
      setShowAnswerResult(false)
      setIsAnswerCorrect(false)
    } else {
      setSessionComplete(true);
    }
  }, [showAnswerResult, currentIndex, isAnswerCorrect, cards])

  // Handle Enter key - только для перехода к следующей карточке (когда показан результат)
  useEffect(() => {
    if (inputMode !== 'typing' || !showAnswerResult) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Проверяем, что фокус не в input поле
      const activeElement = document.activeElement
      if (activeElement && activeElement.tagName === 'INPUT') {
        return // Не обрабатываем, если фокус в input
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        handleAnswerNext()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [inputMode, showAnswerResult, handleAnswerNext])

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
    setIsExiting(false)
    setExitDirection(null)
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

  const handleSelectNewMode = () => {
    setSessionComplete(false)
    setPracticeMode(null)
    setCards([])
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  // Handle Enter key on results screen (sessionComplete)
  useEffect(() => {
    if (!sessionComplete) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Проверяем, что фокус не в input поле
      const activeElement = document.activeElement
      if (activeElement && activeElement.tagName === 'INPUT') {
        return // Не обрабатываем, если фокус в input
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        // Если фокус на кнопке, активируем её, иначе активируем первую кнопку
        if (activeElement && activeElement.tagName === 'BUTTON') {
          (activeElement as HTMLButtonElement).click()
        } else {
          // Фокус на первой кнопке и вызываем её
          const firstButton = document.querySelector('.btn.btn-primary') as HTMLButtonElement
          if (firstButton) {
            firstButton.focus()
            firstButton.click()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [sessionComplete])

  // Memoize current card and progress to prevent unnecessary re-renders
  // MUST be called before any conditional returns (React Hooks rule)
  const currentCard = useMemo(() => {
    if (!cards || cards.length === 0 || currentIndex >= cards.length) return null
    return cards[currentIndex]
  }, [cards, currentIndex])

  const progress = useMemo(() => {
    if (!cards || cards.length === 0) return 0
    return ((currentIndex + 1) / cards.length) * 100
  }, [currentIndex, cards])

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
          <p style={{ marginBottom: '2rem', fontSize: '1rem' }}>
            Вы завершили текущую сессию практики.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSelectNewMode}
              ref={(el) => {
                // Auto-focus first button when results screen appears
                if (el && sessionComplete) {
                  setTimeout(() => el.focus(), 100)
                }
              }}
            >
              Выбрать новый режим
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Safety check for currentCard
  if (!currentCard) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Карточки не найдены или произошла ошибка</p>
          <button className="btn btn-primary" onClick={() => router.push('/practice')}>
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container practice-container" style={{
      paddingBottom: inputMode === 'typing' && showAnswerResult ? '140px' : '0',
    }}>
      {/* Mode switcher and home button */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1rem',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <button
          className="btn btn-secondary"
          onClick={() => router.push('/')}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            borderRadius: '12px',
            fontWeight: '600',
            minWidth: '120px',
            transition: 'all 0.2s ease',
          }}
        >
          ← На главную
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            const newMode = inputMode === 'swipe' ? 'typing' : 'swipe'
            setInputMode(newMode)
            // Сохраняем выбор в localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('practiceInputMode', newMode)
            }
            setIsFlipped(false)
            setUserAnswer('')
            setShowAnswerResult(false)
          }}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.95rem',
            borderRadius: '12px',
            fontWeight: '600',
            minWidth: '160px',
            transition: 'all 0.2s ease',
          }}
        >
          {inputMode === 'swipe' ? 'Ввод ответа' : 'Свайп'}
        </button>
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

      {inputMode === 'swipe' && (
        <>
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
        </>
      )}

      {inputMode === 'typing' && !showAnswerResult && (
        <div className="swipe-hint" style={{
          marginBottom: '1.5rem',
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '2px solid #667eea',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
        }}>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>
            Переведите на английский:
          </p>
        </div>
      )}

      {inputMode === 'swipe' ? (
        <div
          key={`card-${currentIndex}-${currentCard.id}`}
          className={`card practice-card ${isExiting ? (exitDirection === 'left' ? 'exiting-left' : 'exiting-right') : ''}`}
          onClick={handleFlip}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{
            // Use will-change sparingly to optimize rendering
            willChange: isExiting || swipeOffset !== 0 ? 'transform, opacity' : 'auto',
            transform: isExiting
              ? `translateX(${exitDirection === 'left' ? '-150%' : '150%'}) rotate(${exitDirection === 'left' ? '-30deg' : '30deg'}) scale(0.8)`
              : `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.1}deg) scale(${swipeOffset !== 0 ? Math.max(0.95, 1 - Math.abs(swipeOffset) / 500) : 1})`,
            opacity: isExiting
              ? 0
              : (swipeOffset !== 0 ? Math.max(0.8, 1 - Math.abs(swipeOffset) / 400) : 1),
            borderLeft: swipeOffset > 50 ? '5px solid #4CAF50' : 'none',
            borderRight: swipeOffset < -50 ? '5px solid #f44336' : 'none',
            boxShadow: swipeOffset !== 0
              ? `0 ${Math.abs(swipeOffset) / 10}px ${Math.abs(swipeOffset) / 5}px rgba(0, 0, 0, 0.2)`
              : '0 8px 24px rgba(0, 0, 0, 0.12)',
            transition: isExiting ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out' : 'transform 0.2s ease-out, opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
            pointerEvents: isExiting ? 'none' : 'auto',
            // Optimize for low-memory devices
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className={`card-inner ${isFlipped && !isExiting ? 'flipped' : ''}`}>
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
      ) : (
        <>
          {/* Card with Russian word - always visible in typing mode */}
          <div
            key={`card-${currentIndex}-${currentCard.id}`}
            className={`card practice-card ${inputMode === 'typing' && !showAnswerResult ? 'typing-mode-card' : ''}`}
            style={{
              minHeight: showAnswerResult ? 'auto' : 'min(350px, 45vh)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: inputMode === 'typing' && !showAnswerResult ? 'flex-end' : 'flex-start',
              alignItems: 'center',
              padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
              paddingTop: inputMode === 'typing' && !showAnswerResult ? 'clamp(1rem, 3vw, 1.5rem)' : 'clamp(2rem, 6vw, 3rem)',
              paddingBottom: inputMode === 'typing' && !showAnswerResult ? 'clamp(2rem, 5vw, 3rem)' : 'clamp(1.5rem, 4vw, 2.5rem)',
              marginTop: inputMode === 'typing' && !showAnswerResult ? '2rem' : '0',
              marginBottom: showAnswerResult ? '6rem' : '1.5rem',
              border: showAnswerResult
                ? (isAnswerCorrect ? '4px solid #4CAF50' : '4px solid #f44336')
                : '4px solid #667eea',
              background: showAnswerResult
                ? (isAnswerCorrect ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)')
                : 'linear-gradient(135deg, var(--bg-secondary) 0%, #2d2d3a 100%)',
              transition: 'all 0.3s ease',
              boxShadow: showAnswerResult
                ? (isAnswerCorrect ? '0 12px 32px rgba(76, 175, 80, 0.3)' : '0 12px 32px rgba(244, 67, 54, 0.3)')
                : '0 12px 32px rgba(102, 126, 234, 0.25)',
              // Optimize rendering for low-memory devices
              willChange: showAnswerResult ? 'auto' : 'transform',
              contain: 'layout style paint',
            }}
          >
            <div className="card-label" style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '500'
            }}>
              Русский
            </div>
            <div className="card-word" style={{
              fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
              fontWeight: '800',
              marginBottom: '1.5rem',
              textAlign: 'center',
              color: '#ffffff',
              lineHeight: '1.3',
              wordBreak: 'break-word',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              padding: '0 1rem',
            }}>
              {currentCard.russianWord}
            </div>
            {currentCard.russianDescription && (
              <div className="card-description" style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '1rem',
                lineHeight: '1.5',
                maxWidth: '90%'
              }}>
                {currentCard.russianDescription}
              </div>
            )}

            {showAnswerResult && (
              <div style={{
                marginTop: '2rem',
                textAlign: 'center',
                width: '100%',
                paddingTop: '2rem',
                borderTop: '2px solid var(--border-color)'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  color: isAnswerCorrect ? '#4CAF50' : '#f44336'
                }}>
                  {isAnswerCorrect ? '✅ Правильно!' : '❌ Неправильно'}
                </div>
                <div style={{
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong>Ваш ответ:</strong> {userAnswer}
                </div>
                <div style={{
                  marginBottom: '1rem',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong>Правильный ответ:</strong> {currentCard.englishWord}
                </div>
                {currentCard.englishDescription && (
                  <div className="card-description" style={{
                    marginTop: '1rem',
                    fontSize: '1rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    {currentCard.englishDescription}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {inputMode === 'swipe' && isFlipped && (
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

      {inputMode === 'typing' && !showAnswerResult && (
        <div style={{
          width: '100%',
          maxWidth: '600px',
          margin: '2rem auto 0',
          padding: '0 1rem'
        }}>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => {
              // Enter в input - только отправка ответа
              if (e.key === 'Enter' && userAnswer.trim() && !showAnswerResult) {
                e.preventDefault()
                e.stopPropagation() // Останавливаем всплытие события
                handleAnswerSubmit()
              }
            }}
            placeholder="Введите английский перевод..."
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              marginBottom: '0',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              // Устанавливаем цвет границы при фокусе
              e.target.style.borderColor = '#667eea'
              // Предотвращаем автоматическую прокрутку при фокусе на мобильных
              if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                setTimeout(() => {
                  const card = e.target.closest('.practice-container')?.querySelector('.practice-card') as HTMLElement
                  if (card) {
                    card.style.position = 'sticky'
                    card.style.top = '0.5rem'
                    card.style.zIndex = '5'
                  }
                  // Предотвращаем прокрутку к input
                  e.target.scrollIntoView({ behavior: 'auto', block: 'nearest' })
                }, 50)
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)'
              // Возвращаем обычное позиционирование карточки при потере фокуса
              if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                const card = e.target.closest('.practice-container')?.querySelector('.practice-card') as HTMLElement
                if (card) {
                  card.style.position = ''
                  card.style.top = ''
                  card.style.zIndex = ''
                }
              }
            }}
          />
        </div>
      )}

      {inputMode === 'typing' && showAnswerResult && (
        <div className="practice-next-button-container" style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '1rem',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <button
            className="btn btn-primary practice-next-button"
            onClick={handleAnswerNext}
            style={{
              width: '100%',
              padding: '1.5rem 2rem',
              fontSize: '1.3rem',
              fontWeight: '700',
              borderRadius: '12px',
              boxShadow: isAnswerCorrect
                ? '0 6px 20px rgba(76, 175, 80, 0.4)'
                : '0 6px 20px rgba(102, 126, 234, 0.4)',
              background: isAnswerCorrect
                ? 'linear-gradient(135deg, #4CAF50 0%, #388e3c 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              minHeight: '64px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              boxSizing: 'border-box',
            }}
          >
            Далее →
          </button>
        </div>
      )}


    </div>
  )
}

