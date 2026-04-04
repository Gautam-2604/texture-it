'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

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

interface SearchResultsProps {
  results: SearchResult[]
  loading: boolean
  query: string
}

export function SearchResults({ results, loading, query }: SearchResultsProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Set<string>>(new Set())

  const handleDownload = async (result: SearchResult) => {
    setDownloading(result.id)
    setErrors((prev) => { const s = new Set(prev); s.delete(result.id); return s })

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
      a.download = isZip
        ? `${result.id}_2K.zip`
        : `${result.id}_2k.${contentType.includes('png') ? 'png' : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000)
    } catch {
      setErrors((prev) => new Set(prev).add(result.id))
      setTimeout(() => setErrors((prev) => { const s = new Set(prev); s.delete(result.id); return s }), 3000)
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden animate-pulse">
            <div className="aspect-video bg-white/5" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0 && query) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">No textures found for &ldquo;{query}&rdquo;</p>
        <p className="text-zinc-600 text-xs mt-1">Try broader terms like &ldquo;wood&rdquo;, &ldquo;stone&rdquo;, or &ldquo;metal&rdquo;</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-600 text-sm">Search for free PBR textures from Poly Haven</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {query ? `Results for "${query}"` : 'Popular textures'}
        </h2>
        <span className="text-zinc-600 text-sm font-mono">{results.length} found · Poly Haven + AmbientCG</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="group rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden hover:border-white/20 transition-colors"
          >
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={result.thumb}
                alt={result.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
              />
              {/* Source badge */}
              <div className="absolute top-2 right-2">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  result.source === 'polyhaven'
                    ? 'bg-orange-500/90 text-white'
                    : 'bg-sky-500/90 text-white'
                )}>
                  {result.sourceLabel}
                </span>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center">
                <span className="text-white/80 text-xs font-mono bg-black/60 px-3 py-1.5 rounded-full">
                  free • PBR • 2K
                </span>
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm text-zinc-300 font-medium capitalize mb-1 truncate">{result.name}</p>
              {result.categories.length > 0 && (
                <p className="text-xs text-zinc-600 mb-3 truncate">{result.categories.join(' · ')}</p>
              )}
              <div className="flex items-center gap-2">
                <a
                  href={result.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
                >
                  View
                </a>
                <button
                  onClick={() => handleDownload(result)}
                  disabled={downloading === result.id}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-50',
                    errors.has(result.id)
                      ? 'bg-red-600/80 hover:bg-red-600'
                      : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600'
                  )}
                >
                  {downloading === result.id ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : errors.has(result.id) ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {errors.has(result.id) ? 'Failed' : result.source === 'ambientcg' ? 'Get Asset' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
