'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { PromptInput } from '@/components/PromptInput'
import { GenerateButton } from '@/components/GenerateButton'
import { TextureGallery } from '@/components/TextureGallery'
import { GeneratingLoader } from '@/components/GeneratingLoader'
import { SearchResults } from '@/components/SearchResults'
import { LiveSearchResults, LiveResult, SuggestedSite } from '@/components/LiveSearchResults'
import { cn } from '@/lib/utils'

interface Texture {
  id: string
  prompt: string
  url: string
  createdAt: string
}

interface SearchResult {
  id: string
  name: string
  categories: string[]
  thumb: string
  downloadUrl: string
  pageUrl: string
  source: 'polyhaven' | 'ambientcg'
  sourceLabel: string
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
  const [mode, setMode] = useState<'ai' | 'search'>('ai')

  // AI mode state
  const [prompt, setPrompt] = useState('')
  const [textures, setTextures] = useState<Texture[]>([])
  const [loading, setLoading] = useState(false)
  const [newTextureId, setNewTextureId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live search state
  const [liveResults, setLiveResults] = useState<LiveResult[]>([])
  const [liveSuggestedSites, setLiveSuggestedSites] = useState<SuggestedSite[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [liveSearched, setLiveSearched] = useState(false)

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
    if (mode === 'ai' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleGenerate()
    }
  }

  const runSearch = useCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results)
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      runSearch(val)
    }, 400)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    runSearch(searchQuery)
  }

  const handleLiveSearch = async () => {
    if (!searchQuery.trim()) return
    setLiveLoading(true)
    setLiveError(null)
    setLiveSearched(true)
    try {
      const res = await fetch(`/api/search/live?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (!res.ok) {
        setLiveError(data.error ?? 'Live search failed')
        setLiveResults([])
        setLiveSuggestedSites([])
      } else {
        setLiveResults(data.results)
        setLiveSuggestedSites(data.suggestedSites ?? [])
      }
    } catch {
      setLiveError('Something went wrong. Please try again.')
      setLiveResults([])
    } finally {
      setLiveLoading(false)
    }
  }

  // Load popular textures when switching to search mode
  const handleModeSwitch = (newMode: 'ai' | 'search') => {
    setMode(newMode)
    if (newMode === 'search' && searchResults.length === 0) {
      runSearch('')
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
        {/* Mode Toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => handleModeSwitch('ai')}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                mode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI Generate
            </button>
            <button
              onClick={() => handleModeSwitch('search')}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                mode === 'search'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search Assets
            </button>
          </div>
        </div>

        {/* AI Mode */}
        {mode === 'ai' && (
          <>
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
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/20 text-amber-400/80 text-xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </span>
                  Scouting for a better AI model — upgrades incoming
                </div>
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
          </>
        )}

        {/* Search Mode */}
        {mode === 'search' && (
          <>
            <div className="mb-10">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-black text-white mb-2">Search free assets</h1>
                <p className="text-zinc-500">
                  Browse{' '}
                  <a href="https://polyhaven.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">Poly Haven</a>
                  {' '}+{' '}
                  <a href="https://ambientcg.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 transition-colors">AmbientCG</a>
                  {', or use '}
                  <span className="text-white font-medium">Live Web Search</span>
                  {' for 3D textures & 2D sprites across the web'}
                </p>
              </div>

              <div className="space-y-3">
              <form onSubmit={handleSearchSubmit} className="relative w-full group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-2xl blur opacity-30 group-focus-within:opacity-70 transition-opacity duration-500" />
                <div className="relative flex items-center bg-[#0d0d0d] rounded-2xl border border-white/10 group-focus-within:border-purple-500/50 transition-colors duration-300 px-5 py-4 gap-3">
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="wood, stone, metal, fabric, concrete..."
                    className="flex-1 bg-transparent text-white text-lg font-light placeholder:text-zinc-600 focus:outline-none"
                    autoFocus
                  />
                  {searchLoading && (
                    <svg className="w-4 h-4 text-zinc-500 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
              </form>

              {/* Live Search button */}
              <button
                onClick={handleLiveSearch}
                disabled={!searchQuery.trim() || liveLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all',
                  searchQuery.trim() && !liveLoading
                    ? 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-950/50 hover:border-purple-500/60'
                    : 'border-white/5 bg-white/5 text-zinc-600 cursor-not-allowed'
                )}
              >
                {liveLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching the web...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
                    </svg>
                    Live Web Search — textures, sprites & 2D assets
                  </>
                )}
              </button>
              </div>
            </div>

            <SearchResults results={searchResults} loading={searchLoading} query={searchQuery} />

            {(liveSearched || liveLoading) && (
              <LiveSearchResults
                results={liveResults}
                suggestedSites={liveSuggestedSites}
                loading={liveLoading}
                query={searchQuery}
                error={liveError}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
