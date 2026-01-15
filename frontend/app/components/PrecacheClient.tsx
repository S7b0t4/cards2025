'use client'

import { useEffect } from 'react'
import { autoPrecache } from '../lib/precache-pages'

export function PrecacheClient() {
  useEffect(() => {
    // Автоматически предзагружаем страницы после загрузки
    autoPrecache()
  }, []);

  return null;
}
