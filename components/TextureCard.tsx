'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { CardContainer, CardBody, CardItem } from '@/components/ui/card-3d'
import { cn } from '@/lib/utils'

interface TextureCardProps {
  id: string
  prompt: string
  url: string
  createdAt: string
  isNew?: boolean
}

export function TextureCard({ id, prompt, url, createdAt, isNew }: TextureCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadError, setDownloadError] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError(false)
    try {
      const res = await fetch(`/api/download?id=${id}`)
      if (!res.ok) throw new Error('Download failed')

      // Guard: make sure we got an image, not an error JSON
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.startsWith('image/')) throw new Error('Invalid response')

      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `textura-${id.slice(0, 8)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Delay revoke so the browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000)
    } catch {
      setDownloadError(true)
      setTimeout(() => setDownloadError(false), 3000)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <CardContainer containerClassName="w-full">
      <CardBody className={cn(
        'w-full h-auto relative group/card rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden',
        isNew && 'ring-2 ring-purple-500/60 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
      )}>
        {isNew && (
          <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold tracking-wider uppercase">
            New
          </div>
        )}

        <CardItem translateZ="50" className="w-full">
          <div className="relative w-full aspect-video overflow-hidden">
            <Image
              src={url}
              alt={prompt}
              fill
              className="object-cover transition-transform duration-500 group-hover/card:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Tile preview overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center">
              <span className="text-white/80 text-xs font-mono bg-black/60 px-3 py-1.5 rounded-full">
                seamless tileable
              </span>
            </div>
          </div>
        </CardItem>

        <CardItem translateZ="30" className="w-full p-4">
          <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed mb-3">{prompt}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 font-mono">{date}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPrompt}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Copy prompt"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-50',
                  downloadError
                    ? 'bg-red-600/80 hover:bg-red-600'
                    : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600'
                )}
              >
                {downloading ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : downloadError ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {downloadError ? 'Failed' : 'Download'}
              </button>
            </div>
          </div>
        </CardItem>
      </CardBody>
    </CardContainer>
  )
}
