import React from 'react'
import { cn } from '@/lib/utils'

export function AnimatedGradientText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]',
        className
      )}
    >
      {children}
    </span>
  )
}
