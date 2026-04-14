'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function HeroSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/app?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/app')
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative w-full group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-2xl blur opacity-40 group-focus-within:opacity-80 transition-opacity duration-500" />
        <div className="relative flex items-center bg-[#0d0d0d] rounded-2xl border border-white/10 group-focus-within:border-purple-500/50 transition-colors duration-300 px-5 py-4 gap-3">
          <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="wood, stone, grass sprite, metal texture..."
            className="flex-1 bg-transparent text-white text-lg font-light placeholder:text-zinc-600 focus:outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Search
          </button>
        </div>
      </form>
      <p className="text-center text-zinc-600 text-sm">
        or{' '}
        <Link href="/app?mode=ai" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
          generate with AI
        </Link>
        {' '}— describe any surface in natural language
      </p>
    </div>
  )
}
