'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  name: string
  categories: string[]
  thumb: string
  downloadUrl: string | null
  pageUrl: string
  source: 'polyhaven' | 'ambientcg' | '3dtextures' | 'freepbr' | 'subtlepatterns' | 'transparenttextures' | 'lostandtaken'
  sourceLabel: string
  assetDimension: '2d' | '3d'
}

interface SearchResultsProps {
  results: SearchResult[]
  loading: boolean
  query: string
}

const SOURCE_BADGE_COLORS: Record<string, string> = {
  polyhaven: 'bg-orange-500/90',
  ambientcg: 'bg-sky-500/90',
  '3dtextures': 'bg-violet-600/90',
  freepbr: 'bg-teal-600/90',
  subtlepatterns: 'bg-pink-600/90',
  transparenttextures: 'bg-amber-600/90',
  lostandtaken: 'bg-stone-600/90',
}

const FREE_BADGE: Record<string, { label: string; className: string }> = {
  polyhaven: { label: 'CC0', className: 'bg-emerald-600/90 text-white' },
  ambientcg: { label: 'CC0', className: 'bg-emerald-600/90 text-white' },
  '3dtextures': { label: 'Free', className: 'bg-green-600/90 text-white' },
  freepbr: { label: 'Free', className: 'bg-green-600/90 text-white' },
  subtlepatterns: { label: 'CC0', className: 'bg-emerald-600/90 text-white' },
  transparenttextures: { label: 'Free', className: 'bg-green-600/90 text-white' },
  lostandtaken: { label: 'Free', className: 'bg-green-600/90 text-white' },
}

type AssetFilter = 'all' | '3d' | '2d'

export function SearchResults({ results, loading, query }: SearchResultsProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all')

  const filteredResults = assetFilter === 'all'
    ? results
    : results.filter((r) => r.assetDimension === assetFilter)

  const count3d = results.filter((r) => r.assetDimension === '3d').length
  const count2d = results.filter((r) => r.assetDimension === '2d').length

  const handleDownload = async (result: SearchResult) => {
    if (!result.downloadUrl) return
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
        <p className="text-zinc-500 text-sm">No assets found for &ldquo;{query}&rdquo;</p>
        <p className="text-zinc-600 text-xs mt-1">Try broader terms like &ldquo;wood&rdquo;, &ldquo;stone&rdquo;, &ldquo;character&rdquo;, or &ldquo;sprite&rdquo;</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-600 text-sm">Search free textures from Poly Haven, AmbientCG, 3DTextures, FreePBR, Subtle Patterns, Transparent Textures, and Lost and Taken</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          {query ? `Results for "${query}"` : 'Popular assets'}
        </h2>
        <span className="text-zinc-600 text-sm font-mono">{results.length} found · Poly Haven · AmbientCG · 3DTextures · FreePBR · Subtle Patterns · Transparent Textures · Lost and Taken</span>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 mb-6">
        {([
          { key: 'all' as AssetFilter, label: `All (${results.length})` },
          { key: '3d' as AssetFilter, label: `3D (${count3d})` },
          { key: '2d' as AssetFilter, label: `2D (${count2d})` },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAssetFilter(key)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold transition-all',
              assetFilter === key
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResults.map((result) => (
          <div
            key={result.id}
            className="group rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden hover:border-white/20 transition-colors"
          >
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
              {/* Free/CC0 badge — top-left */}
              <div className="absolute top-2 left-2">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  FREE_BADGE[result.source]?.className ?? 'bg-green-600/90 text-white'
                )}>
                  {FREE_BADGE[result.source]?.label ?? 'Free'}
                </span>
              </div>
              {/* Source + dimension badges — top-right */}
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full text-white',
                  SOURCE_BADGE_COLORS[result.source] ?? 'bg-zinc-600/90'
                )}>
                  {result.sourceLabel}
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full text-white',
                  result.assetDimension === '2d' ? 'bg-lime-700/90' : 'bg-indigo-700/90'
                )}>
                  {result.assetDimension === '2d' ? '2D' : '3D'}
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
                {!result.downloadUrl || result.source === '3dtextures' || result.source === 'freepbr' ? (
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
                ) : (
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
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
