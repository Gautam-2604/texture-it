'use client'
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false, // we handle this manually below
      capture_pageleave: true,
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()

  // Identify user once loaded
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.emailAddresses?.[0]?.emailAddress,
        name: user.fullName,
      })
    }
  }, [user])

  // Track page views on route change
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
