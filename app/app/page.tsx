'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { PromptInput } from '@/components/PromptInput'
import { GenerateButton } from '@/components/GenerateButton'
import { TextureGallery } from '@/components/TextureGallery'
import { GeneratingLoader } from '@/components/GeneratingLoader'

interface Texture {
  id: string
  prompt: string
  url: string
  createdAt: string
}

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#a855f7', '#3b82f6', '#ec4899', '#10b981', '#f59e0b'],
  })
}

export default function AppPage() {
  const [prompt, setPrompt] = useState('')
  const [textures, setTextures] = useState<Texture[]>([])
  const [loading, setLoading] = useState(false)
  const [newTextureId, setNewTextureId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchTextures = useCallback(async () => {
    try {
      const res = await fetch('/api/textures')
      if (res.ok) {
        const data = await res.json()
        setTextures(data.textures)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchTextures()
  }, [fetchTextures])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setError(null)
    setLoading(true)
    setNewTextureId(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      const newTexture: Texture = {
        id: data.id,
        prompt: data.prompt,
        url: data.url,
        createdAt: data.createdAt,
      }

      setTextures((prev) => [newTexture, ...prev])
      setNewTextureId(data.id)
      setPrompt('')
      await fireConfetti()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleGenerate()
    }
  }

  return (
    <div className="min-h-screen bg-[#080808]" onKeyDown={handleKeyDown}>
      <GeneratingLoader visible={loading} />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-[#080808]/80 backdrop-blur-md border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-white font-bold tracking-tight">Textura</span>
        </Link>
        <UserButton />
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Generator */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">Generate a texture</h1>
            <p className="text-zinc-500">
              Describe any surface — the AI handles the rest.{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-mono">
                ⌘ Enter
              </kbd>{' '}
              to generate
            </p>
          </div>

          <div className="space-y-4">
            <PromptInput value={prompt} onChange={setPrompt} disabled={loading} />

            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-sm">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {error}
              </div>
            )}

            <GenerateButton onClick={handleGenerate} loading={loading} disabled={!prompt.trim()} />
          </div>
        </div>

        {/* Gallery */}
        {textures.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Your textures</h2>
              <span className="text-zinc-600 text-sm font-mono">{textures.length} generated</span>
            </div>
            <TextureGallery textures={textures} newTextureId={newTextureId} />
          </div>
        )}

        {textures.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Generate your first texture above</p>
          </div>
        )}
      </main>
    </div>
  )
}
