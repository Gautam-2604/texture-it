'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface SuggestedSite {
  name: string
  url: string
  description: string
}

export interface LiveResult {
  id: string
  name: string
  description: string
  thumb: string | null
  downloadUrl: string | null
  pageUrl: string
  source: string
  assetType: '2d' | '3d'
  canDownload: boolean
}

interface LiveSearchResultsProps {
  results: LiveResult[]
  suggestedSites: SuggestedSite[]
  loading: boolean
  query: string
  error: string | null
}

const FREE_SOURCES = new Set([
  'opengameart.org', 'kenney.nl', 'game-icons.net',
  'polyhaven.com', 'ambientcg.com', '3dtextures.me',
  'freepbr.com', 'cgbookcase.com', 'sharetextures.com',
  'publicdomaintextures.net', 'texturecan.com',
])
// These sites have a mix of free previews and paid full assets
const MIXED_SOURCES = new Set(['craftpix.net', 'itch.io'])

function pricingBadge(source: string): { label: string; className: string } {
  if (MIXED_SOURCES.has(source)) return { label: 'Paid/Free', className: 'bg-amber-600/90 text-white' }
  return { label: 'Free', className: 'bg-emerald-700/90 text-white' }
}

const SOURCE_COLORS: Record<string, string> = {
  // 3D / texture sources
  'polyhaven.com': 'bg-orange-500/90',
  'ambientcg.com': 'bg-sky-500/90',
  '3dtextures.me': 'bg-emerald-500/90',
  'freepbr.com': 'bg-violet-500/90',
  'cgbookcase.com': 'bg-rose-500/90',
  'sharetextures.com': 'bg-amber-500/90',
  // 2D / texture sources
  'opengameart.org': 'bg-lime-600/90',
  'kenney.nl': 'bg-cyan-600/90',
  'craftpix.net': 'bg-teal-600/90',
  'itch.io': 'bg-red-600/90',
}

function sourceBadgeColor(source: string) {
  return SOURCE_COLORS[source] ?? 'bg-zinc-600/90'
}

export function LiveSearchResults({ results, suggestedSites, loading, query, error }: LiveSearchResultsProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (result: LiveResult) => {
    if (!result.downloadUrl) return
    setDownloading(result.id)
    try {
      const res = await fetch(result.downloadUrl)
      if (!res.ok) throw new Error('Download failed')

      const contentType = res.headers.get('content-type') ?? ''
      const isImage = contentType.startsWith('image/')
      const isZip = contentType.includes('zip') || contentType.includes('octet-stream')
      if (!isImage && !isZip) throw new Error('Unexpected response type')

      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl

      const safeName = result.name.replace(/\s+/g, '_')
      a.download = isZip
        ? `${safeName}_2K.zip`
        : `${safeName}_2k.${contentType.includes('png') ? 'png' : 'jpg'}`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000)
    } catch {
      // silent — button just stops spinning
    } finally {
      setTimeout(() => setDownloading(null), 500)
    }
  }

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-purple-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-zinc-400 text-sm">Expanding your query with AI and searching the web...</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 px-4 py-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-sm">
        {error === 'SERPER_API_KEY not configured'
          ? 'Live search requires a Serper API key (SERPER_API_KEY). Sign up free at serper.dev — no credit card needed.'
          : `Live search failed: ${error}`}
      </div>
    )
  }

  if (results.length === 0 && query) {
    return (
      <div className="mt-6 text-center py-10">
        <p className="text-zinc-500 text-sm">No live results found for &ldquo;{query}&rdquo;</p>
        <p className="text-zinc-600 text-xs mt-1">Try terms like &ldquo;wood texture&rdquo;, &ldquo;stone&rdquo;, &ldquo;grass sprite&rdquo;, or &ldquo;character icon&rdquo;</p>
      </div>
    )
  }

  if (results.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Live web results</h3>
        </div>
        <span className="text-zinc-600 text-sm font-mono">{results.length} found across the web</span>
      </div>

      {suggestedSites.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl border border-white/8 bg-white/[0.03]">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Search directly on these sites
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedSites.map((site) => (
              <a
                key={site.url}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                title={site.description}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 text-zinc-400 hover:text-white text-xs font-medium transition-all"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {site.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="group rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden hover:border-white/20 transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-zinc-900">
              {result.thumb ? (
                <Image
                  src={result.thumb}
                  alt={result.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                  </svg>
                </div>
              )}
              {/* Source badge */}
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full text-white', sourceBadgeColor(result.source))}>
                  {result.source}
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full text-white',
                  result.assetType === '2d' ? 'bg-lime-700/90' : 'bg-indigo-700/90'
                )}>
                  {result.assetType === '2d' ? '2D' : '3D'}
                </span>
              </div>
              {/* Download indicator */}
              {result.canDownload && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600/90 text-white">
                    Direct DL
                  </span>
                </div>
              )}
              {/* Pricing badge — bottom-left */}
              <div className="absolute bottom-2 left-2">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', pricingBadge(result.source).className)}>
                  {pricingBadge(result.source).label}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-sm text-zinc-200 font-medium mb-1 line-clamp-1">{result.name}</p>
              {result.description && (
                <p className="text-xs text-zinc-600 mb-3 line-clamp-2 leading-relaxed">{result.description}</p>
              )}

              <div className="flex items-center gap-2">
                <a
                  href={result.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Visit Site
                </a>

                {result.canDownload ? (
                  <button
                    onClick={() => handleDownload(result)}
                    disabled={downloading === result.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {downloading === result.id ? (
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    Download
                  </button>
                ) : (
                  <a
                    href={result.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-semibold transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Get Asset
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
