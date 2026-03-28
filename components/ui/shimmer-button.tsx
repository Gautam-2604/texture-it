'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  children: React.ReactNode
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerSize = '0.1em',
      shimmerDuration = '1.5s',
      borderRadius = '100px',
      background = 'linear-gradient(135deg, #7c3aed, #2563eb, #db2777)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--radius': borderRadius,
            '--speed': shimmerDuration,
            '--cut': shimmerSize,
            '--bg': background,
          } as React.CSSProperties
        }
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/20 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-95',
          'before:absolute before:inset-0 before:overflow-hidden before:[border-radius:var(--radius)] before:[mask:linear-gradient(white,_transparent_50%)] before:animate-[shimmer_var(--speed)_infinite] before:[background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]',
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 font-bold tracking-wide">{children}</span>
      </button>
    )
  }
)

ShimmerButton.displayName = 'ShimmerButton'
