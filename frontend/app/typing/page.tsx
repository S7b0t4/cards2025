'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '../lib/axios-config'

interface Card {
  id: number
  russianWord: string
  englishWord: string
  russianDescription?: string
  englishDescription?: string
}

interface TypingStats {
  wpm: number
  accuracy: number
  time: number
  correctWords: number
  incorrectWords: number
  totalWords: number
}

type TypingMode = 'words' | 'time'

export default function TypingPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  // Load mode from localStorage on mount
  const [mode, setMode] = useState<TypingMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('typing-mode') as TypingMode
      return savedMode === 'words' || savedMode === 'time' ? savedMode : 'words'
    }
    return 'words'
  })
  const [targetWords, setTargetWords] = useState(50)
  const [targetTime, setTargetTime] = useState(30)
  const [visibleLines, setVisibleLines] = useState(3) // Show 3 lines of text
  const [showHints, setShowHints] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('typing-hints')
      return saved === 'true'
    }
    return false
  })
  const wordHints = useRef<Map<string, string>>(new Map()) // Map of english word to russian translation
  const charToWordMap = useRef<Map<number, string>>(new Map()) // Map of character index to original word/phrase from cards
  const charToLineMap = useRef<Map<number, number>>(new Map()) // Map of character index to line number
  const [hiddenLinesCount, setHiddenLinesCount] = useState(0) // Количество скрытых строк сверху
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 0,
    time: 0,
    correctWords: 0,
    incorrectWords: 0,
    totalWords: 0,
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState<Set<number>>(new Set())
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeModeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wordsRef = useRef<string[]>([])
  const allWordsRef = useRef<string[]>([]) // All available words from cards
  const usedWordsRef = useRef<Set<string>>(new Set()) // Track used words to avoid immediate repeats

  // Check auth and load cards on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }
    
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('typing-mode') as TypingMode
    if (savedMode === 'words' || savedMode === 'time') {
      console.log('[TYPING] Loading saved mode from localStorage:', savedMode)
      setMode(savedMode)
    }
    
    fetchCards()
  }, [router])

  // Generate text when cards are loaded
  useEffect(() => {
    if (cards.length > 0 && !loading) {
      generateNewText()
    }
  }, [cards, loading])
  
  // Создаём маппинг символов к строкам после рендера
  useEffect(() => {
    if (text.length > 0) {
      // Ждём рендера, затем измеряем реальные позиции
      const timeoutId = setTimeout(() => {
        const textContainer = document.querySelector('.typing-text')
        if (textContainer) {
          const allChars = textContainer.querySelectorAll('.char')
          if (allChars.length > 0) {
            const lineMap = new Map<number, number>()
            let currentLine = 0
            let lastTop = -1
            
            allChars.forEach((char, index) => {
              const charEl = char as HTMLElement
              const rect = charEl.getBoundingClientRect()
              const top = rect.top
              
              // Если позиция top изменилась значительно, значит это новая строка
              if (lastTop !== -1 && Math.abs(top - lastTop) > 15) {
                currentLine++
              }
              
              lineMap.set(index, currentLine)
              if (lastTop === -1 || Math.abs(top - lastTop) > 15) {
                lastTop = top
              }
            })
            
            charToLineMap.current = lineMap
            console.log('[TYPING] Created char to line map after render:', lineMap.size, 'characters, lines:', currentLine + 1)
          }
        }
      }, 200)
      
      return () => clearTimeout(timeoutId)
    }
  }, [text])

  // Focus input when started and keep focus
  useEffect(() => {
    if (inputRef.current && !isFinished) {
      // Небольшая задержка для гарантии, что элемент готов
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }, [isStarted, text, isFinished])
  
  // Keep focus on input - возвращаем фокус при клике вне поля
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Если клик не на textarea и не на кнопках управления
      const target = e.target as HTMLElement
      if (target && !target.closest('textarea') && !target.closest('button') && inputRef.current && !isFinished) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 50)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isFinished])

  // Global Tab handler for restart (works everywhere)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        handleRestart()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/api/cards')
      console.log('[TYPING] Cards fetched - response:', response)
      console.log('[TYPING] Cards data:', response.data)
      
      // API returns object with 'cards' array, not direct array
      let cardsArray: Card[] = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Direct array
          cardsArray = response.data
          console.log('[TYPING] Cards is direct array, count:', cardsArray.length)
        } else if (response.data.cards && Array.isArray(response.data.cards)) {
          // Object with 'cards' property
          cardsArray = response.data.cards
          console.log('[TYPING] Cards from object.cards, count:', cardsArray.length)
        } else {
          console.error('[TYPING] Invalid cards data format:', response.data)
          setError('Неверный формат данных карточек.')
          setCards([])
          return
        }
      }
      
      console.log('[TYPING] Final cards array count:', cardsArray.length)
      if (cardsArray.length > 0) {
        console.log('[TYPING] First card example:', cardsArray[0])
      }
      setCards(cardsArray)
    } catch (err: any) {
      console.error('[TYPING] Error fetching cards:', err)
      console.error('[TYPING] Error response:', err.response)
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/auth')
      } else {
        setError('Ошибка при загрузке карточек. Проверьте подключение к серверу.')
        setCards([])
      }
    } finally {
      setLoading(false)
    }
  }

  const generateNewText = () => {
    let allWords: string[] = []
    
    console.log('[TYPING] generateNewText called')
    console.log('[TYPING] Cards array:', cards)
    console.log('[TYPING] Cards length:', cards.length)
    
    if (cards.length === 0) {
      console.log('[TYPING] No cards available')
      setError('У вас нет карточек. Добавьте карточки, чтобы начать тренировку.')
      return
    }
    
    // Extract words from user's cards - ONLY ENGLISH WORDS from DB
    // Keep word combinations together (don't split by spaces)
    const hintsMap = new Map<string, string>()
    
    cards.forEach((card, index) => {
      console.log(`[TYPING] Processing card ${index}:`, card)
      console.log(`[TYPING] Card ${index} englishWord:`, card.englishWord)
      
      // Use English words as whole (don't split by spaces - keep word combinations together)
      if (card.englishWord) {
        const englishWord = card.englishWord.toLowerCase().trim()
        if (englishWord.length > 0) {
          allWords.push(englishWord)
          // Store hint (russian translation) for this word
          if (card.russianWord) {
            hintsMap.set(englishWord, card.russianWord)
          }
          console.log(`[TYPING] Card ${index} extracted word:`, englishWord, 'hint:', card.russianWord)
        }
      } else {
        console.warn(`[TYPING] Card ${index} has no englishWord`)
      }
    })
    
    // Store hints map
    wordHints.current = hintsMap
    console.log('[TYPING] Hints map:', Array.from(hintsMap.entries()))
    
    console.log('[TYPING] All extracted words (before deduplication):', allWords)
    console.log('[TYPING] Total words count:', allWords.length)
    
    if (allWords.length === 0) {
      console.log('[TYPING] No words extracted from cards')
      setError('В ваших карточках нет английских слов. Проверьте карточки.')
      return
    }
    
    // Remove duplicates while preserving order
    const uniqueWords: string[] = []
    const seen = new Set<string>()
    for (const word of allWords) {
      if (!seen.has(word)) {
        seen.add(word)
        uniqueWords.push(word)
      }
    }
    allWords = uniqueWords
    console.log('[TYPING] Unique words after deduplication:', allWords)
    console.log('[TYPING] Unique words count:', allWords.length)
    
    // Store all available words
    allWordsRef.current = allWords
    console.log('[TYPING] Stored all words in ref:', allWords.length, 'words')
    
    // For words mode, generate enough words
    // For time mode, start with some words and add more dynamically
    let initialCount: number
    if (mode === 'words') {
      // Start with enough words to reach target (or all if less)
      initialCount = Math.min(targetWords, allWords.length * 3) // Can repeat words if needed
    } else {
      // Time mode: start with 10-15 words
      initialCount = Math.min(15, allWords.length)
    }
    
    console.log('[TYPING] Mode:', mode, 'Initial count:', initialCount)
    
    // Generate initial words (can repeat if needed for words mode)
    const shuffled = [...allWords].sort(() => Math.random() - 0.5)
    let initialWords: string[] = []
    
    if (mode === 'words' && allWords.length < initialCount) {
      // Repeat words to reach target
      while (initialWords.length < initialCount) {
        initialWords.push(...shuffled)
      }
      initialWords = initialWords.slice(0, initialCount)
    } else {
      initialWords = shuffled.slice(0, initialCount)
    }
    
    console.log('[TYPING] Initial words array:', initialWords)
    console.log('[TYPING] Initial words count:', initialWords.length)
    
    // Store words for statistics (already lowercase)
    wordsRef.current = initialWords
    usedWordsRef.current = new Set(initialWords)
    
    // Create mapping from character index to original word/phrase
    const charMap = new Map<number, string>()
    let charIdx = 0
    for (const word of initialWords) {
      for (let i = 0; i < word.length; i++) {
        charMap.set(charIdx++, word.toLowerCase())
      }
      // Add space after word
      if (charIdx < initialWords.join(' ').length) {
        charIdx++ // Skip space
      }
    }
    charToWordMap.current = charMap
    charToLineMap.current.clear() // Очищаем маппинг строк, он будет пересоздан после рендера
    console.log('[TYPING] Created char to word map:', charMap.size, 'characters')
    
    // Join words with spaces
    const generatedText = initialWords.join(' ')
    console.log('[TYPING] Generated text (full):', generatedText)
    console.log('[TYPING] Generated text (first 100 chars):', generatedText.substring(0, 100))
    console.log('[TYPING] Text length:', generatedText.length)
    setText(generatedText)
    resetTest()
  }

  const addNextWord = () => {
    const currentWords = wordsRef.current
    const usedWords = usedWordsRef.current
    const allWords = allWordsRef.current
    
    if (allWords.length === 0) {
      console.log('[TYPING] No words available to add')
      return
    }
    
    // Find words that haven't been used recently (last 3 words)
    // Words are already lowercase
    const recentWords = currentWords.slice(-3)
    const availableWords = allWords.filter(w => {
      return !recentWords.includes(w)
    })
    
    // If all words were used recently, use all words (allow repeats after 3 words)
    const wordsToChooseFrom = availableWords.length > 0 ? availableWords : allWords
    
    // Pick a random word
    const randomIndex = Math.floor(Math.random() * wordsToChooseFrom.length)
    const nextWord = wordsToChooseFrom[randomIndex]
    
    console.log('[TYPING] Adding next word:', nextWord, 'Current words count:', currentWords.length)
    
    // Add to current words
    const newWords = [...currentWords, nextWord]
    wordsRef.current = newWords
    
    // Update used words (keep track of last 10 to avoid too many repeats)
    // Words are already lowercase
    usedWords.add(nextWord)
    if (usedWords.size > 10) {
      // Remove oldest used word (but we'll just keep last 10)
      const usedArray = Array.from(usedWords)
      usedWords.clear()
      usedArray.slice(-10).forEach(w => usedWords.add(w))
    }
    
    // Update char to word map for new word
    const currentText = wordsRef.current.join(' ')
    const charMap = new Map<number, string>()
    let charIdx = 0
    for (const word of newWords) {
      for (let i = 0; i < word.length; i++) {
        charMap.set(charIdx++, word.toLowerCase())
      }
      // Add space after word (except last)
      if (charIdx < currentText.length) {
        charIdx++ // Skip space
      }
    }
    charToWordMap.current = charMap
    charToLineMap.current.clear() // Очищаем маппинг строк, он будет пересоздан после рендера
    
    // Update text
    const newText = newWords.join(' ')
    setText(newText)
  }

  const resetTest = () => {
    setUserInput('')
    setIsStarted(false)
    setIsFinished(false)
    setCurrentIndex(0)
    setErrors(new Set())
    setHiddenLinesCount(0) // Сбрасываем скрытые строки
    setStats({
      wpm: 0,
      accuracy: 0,
      time: 0,
      correctWords: 0,
      incorrectWords: 0,
      totalWords: 0,
    })
    startTimeRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeModeIntervalRef.current) {
      clearInterval(timeModeIntervalRef.current)
      timeModeIntervalRef.current = null
    }
    // Reset used words when starting new test (words are already lowercase)
    if (wordsRef.current.length > 0) {
      usedWordsRef.current = new Set(wordsRef.current)
    }
  }

  const startTest = () => {
    setIsStarted(true)
    startTimeRef.current = Date.now()
    
    // Update stats every 100ms
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        calculateStats(elapsed)
        
        // Check time mode finish condition
        if (mode === 'time' && elapsed >= targetTime) {
          finishTest()
        }
      }
    }, 100)
  }

  const calculateStats = (elapsed: number) => {
    if (!isStarted || elapsed <= 0) {
      return
    }
    
    // Обрабатываем текст: убираем пробелы в начале строк для корректного сравнения
    const processedText = text.split('\n').map(line => line.trimStart()).join('\n')
    
    // Count correct and incorrect characters (symbols)
    // Считаем только текущее состояние - если пользователь стёр и переписал правильно,
    // это считается как правильный символ
    const userInputLower = userInput.toLowerCase()
    const textLower = processedText.toLowerCase()
    const totalChars = userInput.length
    let correctChars = 0
    let incorrectChars = 0
    
    // Считаем только до текущей позиции ввода
    for (let i = 0; i < totalChars; i++) {
      // Сравниваем текущий символ в userInput с соответствующим символом в text
      // Если символ правильный на текущий момент - считаем как правильный
      if (i < textLower.length && userInputLower[i] === textLower[i]) {
        correctChars++
      } else {
        // Неправильный символ - но только если это действительно ошибка на текущий момент
        // (не учитываем историю, только текущее состояние)
        incorrectChars++
      }
    }
    
    // Split user input and text into words for WPM calculation
    const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0).map(w => w.toLowerCase())
    const textWords = processedText.trim().split(/\s+/).filter(w => w.length > 0)
    
    // Count correct and incorrect words for WPM
    let correctWords = 0
    let incorrectWords = 0
    
    for (let i = 0; i < userWords.length; i++) {
      if (i < textWords.length && userWords[i] === textWords[i]) {
        correctWords++
      } else {
        incorrectWords++
      }
    }
    
    const totalWords = userWords.length
    
    // Calculate WPM: words per minute (works for both modes)
    // WPM = (correct words typed) / (time in minutes)
    const minutes = elapsed / 60
    const wpm = minutes > 0 ? (correctWords / minutes) : 0
    
    // Calculate accuracy based on characters (symbols) - правильные символы / всего символов
    const accuracy = totalChars > 0 ? ((correctChars / totalChars) * 100) : 100
    
    console.log('[TYPING] Stats calculation:', {
      elapsed,
      minutes,
      correctChars,
      incorrectChars,
      totalChars,
      correctWords,
      totalWords,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy * 10) / 10
    })
    
    const newStats = {
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy * 10) / 10,
      time: Math.round(elapsed),
      correctWords,
      incorrectWords,
      totalWords,
    }
    setStats(newStats)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    if (!isStarted && value.length > 0) {
      startTest()
    }
    
    if (isFinished) return
    
    setUserInput(value)
    
    // Check for errors (compare in lowercase)
    const newErrors = new Set<number>()
    const lowerValue = value.toLowerCase()
    const lowerText = text.toLowerCase()
    for (let i = 0; i < lowerValue.length; i++) {
      if (i >= lowerText.length || lowerValue[i] !== lowerText[i]) {
        newErrors.add(i)
      }
    }
    setErrors(newErrors)
    setCurrentIndex(value.length)
    
    // Определяем, на какой строке находится текущий символ
    const currentCharIndex = value.length > 0 ? value.length - 1 : 0
    const currentLine = charToLineMap.current.get(currentCharIndex) ?? 0
    
    // Когда дошли до конца второй строки (line 1, т.к. нумерация с 0), скрываем первую строку
    // Скрываем строки, которые уже полностью пройдены
    if (currentLine >= 1) {
      // Скрываем все строки до текущей (кроме самой текущей)
      const linesToHide = Math.max(0, currentLine - 1)
      if (linesToHide > hiddenLinesCount) {
        setHiddenLinesCount(linesToHide)
      }
    }
    
    // Check if finished - compare by words (in lowercase)
    // Обрабатываем текст: убираем пробелы в начале строк
    const processedText = text.split('\n').map(line => line.trimStart()).join('\n')
    const userWords = value.trim().split(/\s+/).filter(w => w.length > 0).map(w => w.toLowerCase())
    const textWords = processedText.trim().split(/\s+/).filter(w => w.length > 0)
    
    // Check finish conditions
    if (mode === 'words') {
      // Words mode: finish when target words reached
      const userWordsCount = userWords.length
      if (userWordsCount >= targetWords) {
        finishTest()
        return
      }
      
      // Add next word if user is close to finishing current words (within 2 words)
      if (userWords.length >= textWords.length - 2 && textWords.length > 0) {
        // Check if user has typed the last word (or is typing it)
        const lastTextWord = textWords[textWords.length - 1]
        const userLastWord = userWords[userWords.length - 1] || ''
        
        // If user has completed the last word or is close, add next word
        if (userLastWord.length >= lastTextWord.length * 0.8) {
          // Only add if we haven't already added it and haven't reached target
          if (wordsRef.current.length === textWords.length && userWordsCount < targetWords) {
            addNextWord()
          }
        }
      }
    } else {
      // Time mode: add words dynamically
      if (userWords.length >= textWords.length - 2 && textWords.length > 0) {
        const lastTextWord = textWords[textWords.length - 1]
        const userLastWord = userWords[userWords.length - 1] || ''
        
        if (userLastWord.length >= lastTextWord.length * 0.8) {
          if (wordsRef.current.length === textWords.length) {
            addNextWord()
          }
        }
      }
    }
    
    // Update stats
    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      calculateStats(elapsed)
    }
  }

  const finishTest = async () => {
    setIsFinished(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      
      // Вычисляем финальную статистику
      const processedText = text.split('\n').map(line => line.trimStart()).join('\n')
      const userInputLower = userInput.toLowerCase()
      const textLower = processedText.toLowerCase()
      const totalChars = userInput.length
      let correctChars = 0
      
      for (let i = 0; i < totalChars; i++) {
        if (i < textLower.length && userInputLower[i] === textLower[i]) {
          correctChars++
        }
      }
      
      const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0).map(w => w.toLowerCase())
      const textWords = processedText.trim().split(/\s+/).filter(w => w.length > 0)
      
      let correctWords = 0
      let incorrectWords = 0
      
      for (let i = 0; i < userWords.length; i++) {
        if (i < textWords.length && userWords[i] === textWords[i]) {
          correctWords++
        } else {
          incorrectWords++
        }
      }
      
      const totalWords = userWords.length
      const minutes = elapsed / 60
      const wpm = minutes > 0 ? (correctWords / minutes) : 0
      const accuracy = totalChars > 0 ? ((correctChars / totalChars) * 100) : 100
      
      // Обновляем stats
      const finalStats = {
        wpm: Math.round(wpm),
        accuracy: Math.round(accuracy * 10) / 10,
        time: Math.round(elapsed),
        correctWords,
        incorrectWords,
        totalWords,
      }
      setStats(finalStats)
      
      // Сохраняем статистику в БД
      try {
        const token = localStorage.getItem('token')
        if (token) {
          await apiClient.post('/api/typing/results', {
            ...finalStats,
            mode: mode,
            targetWords: mode === 'words' ? targetWords : undefined,
            targetTime: mode === 'time' ? targetTime : undefined,
          })
          console.log('[TYPING] Statistics saved successfully:', finalStats)
        }
      } catch (error: any) {
        console.error('[TYPING] Error saving statistics:', error)
        // Не показываем ошибку пользователю, просто логируем
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent backspace from going back in browser
    if (e.key === 'Backspace' && userInput.length === 0) {
      e.preventDefault()
    }
    
    // Tab key restarts the test
    if (e.key === 'Tab') {
      e.preventDefault()
      handleRestart()
    }
  }

  const getCharClass = (index: number): string => {
    if (index >= userInput.length) return 'char-pending'
    // Сравниваем текущее состояние, а не историю ошибок
    // Если пользователь стёр и переписал правильно, символ должен быть зелёным
    const processedText = text.split('\n').map(line => line.trimStart()).join('\n')
    if (index < userInput.length && index < processedText.length) {
      const userChar = userInput[index]?.toLowerCase()
      const textChar = processedText[index]?.toLowerCase()
      if (userChar === textChar) return 'char-correct'
      return 'char-error'
    }
    // Если вышли за пределы текста - это ошибка
    return 'char-error'
  }

  const handleRestart = () => {
    resetTest()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleNewText = () => {
    generateNewText()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  if (loading) {
    return (
      <div className="typing-container" tabIndex={0} onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          handleRestart()
        }
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Загрузка карточек...</p>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Нажмите <kbd style={{ 
              padding: '0.25rem 0.5rem', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>Tab</kbd> для перезапуска
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="typing-container">
      <div className="typing-header">
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={() => router.push('/')}
          title="На главную"
        >
          <img 
            src="/logo.png" 
            alt="АБОБА" 
            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '50%' }} 
            onError={(e) => { e.currentTarget.style.display = 'none' }} 
          />
          <h1>Тренажер слепой печати</h1>
        </div>
      </div>

      {error && (
        <div className="card error-card" style={{ marginBottom: '1rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107' }}>
          {error}
        </div>
      )}

      {/* Mode selection and hints toggle */}
      {!isStarted && !isFinished && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="typing-mode-selector" style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center', 
            marginBottom: '0.5rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            boxShadow: '0 2px 4px var(--shadow)'
          }}>
            <button
              className={`btn ${mode === 'words' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                const newMode: TypingMode = 'words'
                setMode(newMode)
                localStorage.setItem('typing-mode', newMode)
                generateNewText()
              }}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              50 слов
            </button>
            <button
              className={`btn ${mode === 'time' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                const newMode: TypingMode = 'time'
                setMode(newMode)
                localStorage.setItem('typing-mode', newMode)
                generateNewText()
              }}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              30 секунд
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            padding: '0.5rem',
          }}>
            <button
              className={`btn ${showHints ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                const newValue = !showHints
                setShowHints(newValue)
                localStorage.setItem('typing-hints', String(newValue))
              }}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              {showHints ? '✓ Подсказки включены' : 'Подсказки выключены'}
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="typing-stats">
        <div className="stat-item">
          <div className="stat-value">{stats.wpm}</div>
          <div className="stat-label">WPM</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.accuracy}%</div>
          <div className="stat-label">Точность</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.time}s</div>
          <div className="stat-label">Время</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.correctWords}/{stats.totalWords}</div>
          <div className="stat-label">Слов</div>
        </div>
      </div>

      {/* Text display - show only 3 lines with auto-scroll */}
      <div 
        className="typing-text-container" 
        style={{ 
          position: 'relative',
          maxHeight: `${visibleLines * 2}em`, // 3 lines * 2em line-height
          overflowY: 'auto', // Нужен для программного скролла
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          userSelect: 'none' // Запрещаем выделение текста
        }} 
        data-version="v2-no-old-hints"
        onWheel={(e) => {
          // Блокируем ручной скролл колесом мыши
          e.preventDefault()
          e.stopPropagation()
        }}
        onTouchMove={(e) => {
          // Блокируем ручной скролл на мобильных
          e.preventDefault()
          e.stopPropagation()
        }}
        ref={(containerEl) => {
          // Автоматическая прокрутка контейнера при вводе
          // Прокручиваем так, чтобы текущий символ был в верхней части видимой области
          // Это обеспечит, что при переходе на новую строку она будет прокручиваться вверх
          if (containerEl && userInput.length > 0 && currentIndex > 0) {
            setTimeout(() => {
              const allChars = containerEl.querySelectorAll('.char')
              if (allChars.length > currentIndex) {
                const currentChar = allChars[Math.min(currentIndex, allChars.length - 1)] as HTMLElement
                if (currentChar) {
                  const charRect = currentChar.getBoundingClientRect()
                  const containerRect = containerEl.getBoundingClientRect()
                  
                  // Вычисляем позицию символа относительно контейнера
                  const charTopRelative = charRect.top - containerRect.top + containerEl.scrollTop
                  const containerHeight = containerEl.offsetHeight
                  
                  // Прокручиваем так, чтобы текущий символ был в верхней части (20% от верха)
                  // Это обеспечит, что при переходе на новую строку она будет видна сверху
                  const topOffset = containerHeight * 0.2 // 20% от высоты контейнера
                  const targetScrollTop = charTopRelative - topOffset
                  
                  // Проверяем, нужно ли прокручивать
                  const needsScroll = 
                    charRect.bottom > containerRect.bottom || 
                    charRect.top < containerRect.top + 30 ||
                    Math.abs(containerEl.scrollTop - targetScrollTop) > 30
                  
                  if (needsScroll) {
                    containerEl.scrollTo({
                      top: Math.max(0, targetScrollTop),
                      behavior: 'smooth'
                    })
                  }
                }
              }
            }, 50)
          }
        }}
      >
        <div 
          className="typing-text" 
          style={{ 
            lineHeight: '2em',
            position: 'relative',
            wordBreak: 'keep-all', // Не разрывать слова
            overflowWrap: 'normal', // Не переносить слова
            whiteSpace: 'pre-wrap', // Сохранять пробелы, но переносить строки
            textIndent: 0, // Убрать отступы в начале строк
            hyphens: 'none', // Отключить автоматические переносы
            transform: `translateY(-${hiddenLinesCount * 2}em)`, // Сдвигаем текст вверх на скрытые строки
            transition: 'transform 0.3s ease-out' // Плавный переход
          }}
        >
          {(() => {
            // Обрабатываем текст: убираем пробелы в начале строк
            const processedText = text.split('\n').map(line => line.trimStart()).join('\n')
            
            // Разбиваем на слова и пробелы, чтобы каждое слово было в отдельном span (слова не будут разрываться)
            const parts = processedText.split(/(\s+)/)
            
            let charIndex = 0
            const result: React.ReactElement[] = []
            
            parts.forEach((part, partIndex) => {
              if (part.trim().length === 0 && part.length > 0) {
                // Это пробел(ы) - отображаем как неразрывные пробелы
                part.split('').forEach((space, spaceIndex) => {
                  const idx = charIndex++
                  const charClass = getCharClass(idx)
                  const isCurrent = idx === currentIndex && !isFinished
                  const charLine = charToLineMap.current.get(idx) || 0
                  // Скрываем символы из скрытых строк
                  const isHidden = charLine < hiddenLinesCount
                  result.push(
                    <span
                      key={`space-${partIndex}-${spaceIndex}`}
                      className={`char ${charClass} ${isCurrent ? 'char-current' : ''}`}
                      style={{
                        display: isHidden ? 'none' : 'inline'
                      }}
                    >
                      {'\u00A0'}
                    </span>
                  )
                })
              } else if (part.length > 0) {
                // Это слово - оборачиваем в span с white-space: nowrap, чтобы оно не разрывалось
                const wordChars = part.split('')
                const wordStartIndex = charIndex
                const wordEndIndex = charIndex + wordChars.length - 1
                // Показываем подсказку если:
                // 1. Курсор находится в пределах слова (включая начало и конец)
                // 2. ИЛИ пользователь уже начал печатать это слово (userInput доходит до этого слова)
                // 3. ИЛИ пользователь дописывает это слово (userInput доходит до конца слова, но не перешёл к следующему)
                const isCursorInWord = currentIndex >= wordStartIndex && currentIndex <= wordEndIndex + 1
                const userInputReachesWord = userInput.length > wordStartIndex
                const userInputBeforeNextWord = userInput.length <= wordEndIndex + 1
                const isCurrentWord = isCursorInWord || (userInputReachesWord && userInputBeforeNextWord)
                
                // Получаем оригинальное слово/словосочетание из карточки для этого символа
                // Используем первый символ слова для поиска оригинального словосочетания
                const originalWord = charToWordMap.current.get(wordStartIndex) || part.toLowerCase()
                const hint = showHints ? wordHints.current.get(originalWord) : null
                
                const wordSpans = wordChars.map((char, charPos) => {
                  const idx = charIndex++
                  const charClass = getCharClass(idx)
                  const isCurrent = idx === currentIndex && !isFinished
                  const charLine = charToLineMap.current.get(idx) || 0
                  // Скрываем символы из скрытых строк
                  const isHidden = charLine < hiddenLinesCount
                  return (
                    <span
                      key={`char-${partIndex}-${charPos}`}
                      className={`char ${charClass} ${isCurrent ? 'char-current' : ''}`}
                      style={{
                        display: isHidden ? 'none' : 'inline'
                      }}
                    >
                      {char}
                    </span>
                  )
                })
                // Оборачиваем слово в span с nowrap, чтобы оно не разрывалось
                result.push(
                  <span
                    key={`word-${partIndex}`}
                    style={{ 
                      whiteSpace: 'nowrap', 
                      display: 'inline-block',
                      position: 'relative',
                      verticalAlign: 'baseline'
                    }}
                  >
                    {wordSpans}
                    {/* Облако с подсказкой под текущим словом */}
                    {isCurrentWord && hint && (
                      <span
                        ref={(hintEl) => {
                          // Корректируем позицию подсказки, чтобы она не выходила за края экрана
                          if (hintEl) {
                            setTimeout(() => {
                              const hintRect = hintEl.getBoundingClientRect()
                              const viewportWidth = window.innerWidth
                              const padding = 16 // Отступ от краёв экрана
                              
                              // Получаем позицию относительно родителя
                              const parentEl = hintEl.offsetParent as HTMLElement
                              const parentRect = parentEl ? parentEl.getBoundingClientRect() : { left: 0 }
                              
                              let left = hintEl.offsetLeft
                              let transform = 'translateX(-50%)'
                              
                              // Вычисляем абсолютную позицию подсказки
                              const hintLeft = hintRect.left
                              const hintRight = hintRect.right
                              
                              // Проверяем правый край
                              if (hintRight > viewportWidth - padding) {
                                const overflow = hintRight - (viewportWidth - padding)
                                left = hintEl.offsetLeft - overflow
                                transform = 'translateX(0)'
                              }
                              
                              // Проверяем левый край
                              if (hintLeft < padding) {
                                const underflow = padding - hintLeft
                                left = hintEl.offsetLeft + underflow
                                transform = 'translateX(0)'
                              }
                              
                              hintEl.style.left = `${left}px`
                              hintEl.style.transform = transform
                            }, 0)
                          }
                        }}
                        style={{
                          display: 'block',
                          position: 'absolute',
                          top: 'calc(100% + 0.25rem)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 16px var(--shadow), 0 2px 8px var(--shadow)',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          border: '1px solid var(--border-color)',
                          pointerEvents: 'none',
                          fontWeight: '500',
                          lineHeight: '1.4',
                          minWidth: 'max-content',
                          maxWidth: '300px',
                          textAlign: 'center'
                        }}
                      >
                        {hint}
                      </span>
                    )}
                  </span>
                )
              }
            })
            
            return result
          })()}
        </div>
        
        {/* Input area - скрыто, размещено поверх текста для удобства */}
        <div className="typing-input-container" style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          pointerEvents: 'auto',
          zIndex: 10,
          margin: 0,
          padding: 0
        }}>
          <textarea
            ref={inputRef}
            className="typing-input"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isStarted ? '' : 'Начните печатать, чтобы начать тест...'}
            disabled={isFinished}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'transparent',
              caretColor: 'transparent',
              resize: 'none',
              padding: '1rem',
              margin: 0,
              fontSize: '1.5rem',
              lineHeight: '2em',
              fontFamily: 'Courier New, monospace',
              overflow: 'hidden'
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="typing-actions">
        <button 
          className="btn btn-primary" 
          onClick={handleRestart}
        >
          Начать заново
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleNewText}
        >
          Новый текст
        </button>
      </div>

      {/* Tab hint */}
      <div style={{ 
        textAlign: 'center', 
        padding: '0.5rem',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem'
      }}>
        Нажмите <kbd style={{ 
          padding: '0.25rem 0.5rem', 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>Tab</kbd> для перезапуска
      </div>

      {/* Results modal */}
      {isFinished && (
        <div className="typing-results-overlay" onClick={handleRestart}>
          <div className="typing-results" onClick={(e) => e.stopPropagation()}>
            <h2>Тест завершен!</h2>
            <div className="results-stats">
              <div className="result-item">
                <div className="result-value">{stats.wpm}</div>
                <div className="result-label">слов в минуту</div>
              </div>
              <div className="result-item">
                <div className="result-value">{stats.accuracy}%</div>
                <div className="result-label">точность</div>
              </div>
              <div className="result-item">
                <div className="result-value">{stats.time}s</div>
                <div className="result-label">время</div>
              </div>
            </div>
            <div className="results-actions">
              <button className="btn btn-primary" onClick={handleRestart}>
                Попробовать снова
              </button>
              <button className="btn btn-secondary" onClick={handleNewText}>
                Новый текст
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
