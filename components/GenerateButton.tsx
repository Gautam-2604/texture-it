'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface GenerateButtonProps {
  onClick: () => void
  loading: boolean
  disabled?: boolean
}

export function GenerateButton({ onClick, loading, disabled }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative w-full py-4 rounded-xl font-bold text-lg tracking-wide overflow-hidden transition-all duration-300',
        'bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600',
        'border border-white/20',
        'hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] hover:scale-[1.01]',
        'active:scale-[0.99]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
        loading && 'animate-pulse'
      )}
    >
      {/* Shimmer overlay */}
      {!loading && !disabled && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-in-out" />
      )}

      <span className="relative z-10 flex items-center justify-center gap-3 text-white">
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating texture...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Texture
          </>
        )}
      </span>
    </button>
  )
}
