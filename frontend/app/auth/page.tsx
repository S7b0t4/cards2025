'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '../lib/axios-config'
import styles from './auth.module.css'

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [botName, setBotName] = useState('')
  const [widgetAvailable, setWidgetAvailable] = useState(true)
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const widgetCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname === '46.191.230.86' ||
    window.location.hostname === 'cards.sybota.space' ||
    window.location.hostname === 'sybota.space' ||
    window.location.hostname === 'www.sybota.space'
  )

  const handleTelegramAuth = async (user: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/telegram', {
        id: user.id,
        first_name: user.first_name || undefined,
        last_name: user.last_name || undefined,
        username: user.username || undefined,
        photo_url: user.photo_url || undefined,
        auth_date: user.auth_date,
        hash: user.hash,
      })

      // Save token
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/dev')

      // Save token
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) {
      router.push('/')
      return
    }

    // Get bot name from env
    const envBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'S7b0t4bot'
    setBotName(envBotName)

    // Set up Telegram auth callback
    window.onTelegramAuth = (user: any) => {
      handleTelegramAuth(user)
    }
  }, [router])

  useEffect(() => {
    if (!botName || !widgetContainerRef.current) return

    // Reset widget availability
    setWidgetAvailable(true)

    // Clear previous widget and timeout
    widgetContainerRef.current.innerHTML = ''
    if (widgetCheckTimeoutRef.current) {
      clearTimeout(widgetCheckTimeoutRef.current)
    }

    // Create script element for Telegram widget
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    // Use MutationObserver to detect when widget loads or shows errors
    const observer = new MutationObserver((mutations) => {
      const container = widgetContainerRef.current
      if (!container) return
      
      // Check for error messages in the container
      const errorText = container.textContent || ''
      const hasError = errorText.includes('invalid') || 
                      errorText.includes('Bot domain') || 
                      errorText.includes('domain invalid') ||
                      errorText.includes('not available')
      
      if (hasError) {
        setWidgetAvailable(false)
        observer.disconnect()
        if (widgetCheckTimeoutRef.current) {
          clearTimeout(widgetCheckTimeoutRef.current)
        }
      }
    })
    
    // Observe changes in the widget container
    if (widgetContainerRef.current) {
      observer.observe(widgetContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      })
    }
    
    // Check if widget loaded successfully after 3 seconds
    widgetCheckTimeoutRef.current = setTimeout(() => {
      const iframe = widgetContainerRef.current?.querySelector('iframe')
      const container = widgetContainerRef.current
      
      // Check if iframe exists and is visible
      if (!iframe) {
        setWidgetAvailable(false)
        observer.disconnect()
        return
      }
      
      // Check if iframe is hidden or has error
      if (iframe.style.display === 'none' || iframe.offsetHeight === 0) {
        setWidgetAvailable(false)
        observer.disconnect()
        return
      }
      
      // Check for error messages in the container
      const errorText = container?.textContent || ''
      if (errorText.includes('invalid') || 
          errorText.includes('domain') || 
          errorText.includes('Bot domain') ||
          errorText.includes('not available')) {
        setWidgetAvailable(false)
        observer.disconnect()
      }
    }, 3000)

    // Listen for script load errors
    script.onerror = () => {
      setWidgetAvailable(false)
      if (widgetCheckTimeoutRef.current) {
        clearTimeout(widgetCheckTimeoutRef.current)
      }
    }

    widgetContainerRef.current.appendChild(script)

    // Cleanup
    return () => {
      observer.disconnect()
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = ''
      }
      if (widgetCheckTimeoutRef.current) {
        clearTimeout(widgetCheckTimeoutRef.current)
      }
    }
  }, [botName])

  if (!botName) {
    return (
      <div className={`container ${styles.authContainer}`}>
        <div className={`card ${styles.authCard}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="АБОБА" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '50%' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <h1 className={styles.authTitle}>Авторизация через Telegram</h1>
          </div>
          <div className={styles.authInfoBox}>
            <p className={styles.authInfoText}>
              <strong>Настройка:</strong> Укажите имя вашего Telegram бота в переменной окружения NEXT_PUBLIC_TELEGRAM_BOT_NAME
            </p>
            <p className={styles.authInfoText}>
              Имя бота - это то, что вы указали при создании бота через @BotFather (без @)
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`container ${styles.authContainer}`}>
      <div className={`card ${styles.authCard}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="АБОБА" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '50%' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1 className={styles.authTitle}>Авторизация через Telegram</h1>
        </div>
        
        <div className={styles.authInfoBox}>
          <h3 className={styles.authInfoTitle}>Добро пожаловать! 👋</h3>
          <p className={styles.authInfoText}>
            Для входа в приложение используйте авторизацию через Telegram. Это безопасно и быстро - вам не нужно вводить пароль.
          </p>
          <p className={styles.authInfoText} style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Нажмите кнопку ниже, чтобы войти через ваш Telegram аккаунт.
          </p>
        </div>

        {error && (
          <div className={styles.authError}>
            <strong>Ошибка авторизации:</strong> {error}
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              Убедитесь, что домен настроен в BotFather и токен бота указан правильно.
            </p>
          </div>
        )}

        {loading && (
          <div className={styles.authLoading}>
            Авторизация...
          </div>
        )}

        <div 
          ref={widgetContainerRef}
          className={`${styles.authWidgetContainer} ${!widgetAvailable ? styles.authWidgetDisabled : ''}`}
        />
        
        {!widgetAvailable && (
          <div className={styles.authWidgetUnavailable}>
            <p className={styles.authWidgetUnavailableText}>
              ⚠️ Авторизация через Telegram временно недоступна
            </p>
            <p className={styles.authWidgetUnavailableSubtext}>
              Домен настраивается. Попробуйте позже или используйте тестовый аккаунт.
            </p>
          </div>
        )}

        {isDev && (
          <div className={styles.authDevBox}>
            <p className={styles.authDevText}>
              <strong>Тестовый режим:</strong> Для тестирования без настройки Telegram используйте кнопку ниже
            </p>
            <button
              onClick={handleDevLogin}
              disabled={loading}
              className={`btn btn-primary ${styles.authDevButton}`}
            >
              Войти как тестовый аккаунт
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
