'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/customers/potential')
  }, [router])

  return null
}
