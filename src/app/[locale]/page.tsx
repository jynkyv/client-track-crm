'use client'

import { useEffect } from 'react'
import { useRouter } from '@/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useTranslations('Common')

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <div>{t('loading')}</div>
    </div>
  )
}
