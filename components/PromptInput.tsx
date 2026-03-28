'use client'
import React, { useRef } from 'react'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const SUGGESTIONS = [
  'Cracked obsidian with glowing lava veins',
  'Mossy ancient stone bricks, wet with rain',
  'Brushed rose gold metallic surface',
  'Neon circuit board, cyberpunk blue',
  'Weathered leather, deep burgundy',
  'Crystalline ice formation, arctic blue',
  'Overgrown jungle bark with moss',
  'Hammered copper with oxidation',
]

export function PromptInput({ value, onChange, disabled, placeholder }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
    }
  }

  const randomSuggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]

  return (
    <div className="relative w-full group">
      {/* Outer glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-2xl blur opacity-30 group-focus-within:opacity-70 transition-opacity duration-500" />

      {/* Inner container */}
      <div className="relative bg-[#0d0d0d] rounded-2xl border border-white/10 group-focus-within:border-purple-500/50 transition-colors duration-300 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-zinc-500 ml-2 font-mono">describe your texture</span>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? randomSuggestion}
          maxLength={500}
          rows={4}
          className={cn(
            'w-full bg-transparent px-5 py-4 text-white text-lg font-light placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Bottom info bar */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <span className="text-xs text-zinc-600 font-mono">
            seamless • tileable • 1024×1024
          </span>
          <span
            className={cn(
              'text-xs font-mono tabular-nums transition-colors',
              value.length > 450 ? 'text-red-400' : value.length > 350 ? 'text-orange-400' : 'text-zinc-600'
            )}
          >
            {value.length}/500
          </span>
        </div>
      </div>
    </div>
  )
}
