'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface UsageBadgeProps {
  used: number
  limit: number
  plan: 'free' | 'pro'
}

export function UsageBadge({ used, limit, plan }: UsageBadgeProps) {
  if (plan === 'pro') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-900/60 to-blue-900/60 border border-purple-500/30 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-purple-200">Pro — Unlimited</span>
      </div>
    )
  }

  const percent = (used / limit) * 100
  const isWarning = percent >= 60
  const isCritical = percent >= 80

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-500',
        isCritical
          ? 'bg-red-950/60 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
          : isWarning
          ? 'bg-orange-950/60 border-orange-500/40'
          : 'bg-zinc-900/60 border-white/10'
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isCritical ? 'bg-red-400 animate-pulse' : isWarning ? 'bg-orange-400' : 'bg-purple-400'
        )}
      />
      <span
        className={cn(
          'text-xs font-semibold',
          isCritical ? 'text-red-300' : isWarning ? 'text-orange-300' : 'text-zinc-300'
        )}
      >
        {used} / {limit} free textures used
      </span>
    </div>
  )
}
