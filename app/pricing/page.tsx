'use client'
import React from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

const FEATURES_FREE = [
  'Unlimited textures',
  '1024×1024 resolution',
  'Seamless tileable output',
  'PNG download',
  'Full texture history',
]

export default function PricingPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="min-h-screen bg-[#080808]">
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-white font-bold tracking-tight">Textura</span>
        </Link>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/app" className="text-zinc-400 hover:text-white text-sm transition-colors">
              Go to app
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-zinc-400 hover:text-white text-sm transition-colors">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-500/30 text-green-300 text-xs font-semibold mb-6 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Free during beta
          </div>
          <h1 className="text-5xl font-black text-white mb-4">Free for everyone, right now</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Textura is completely free while we&apos;re in beta. Generate as many textures as you want — no card, no limits.
          </p>
        </div>

        {/* Single free card */}
        <div className="relative p-px rounded-2xl overflow-hidden max-w-md mx-auto" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(59,130,246,0.8), rgba(16,185,129,0.6))' }}>
          <div className="p-8 rounded-2xl bg-[#0d0d0d]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Beta Access</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-zinc-500 text-sm">/ forever (for now)</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-green-600/70 text-white text-[10px] font-bold tracking-widest uppercase">
                Active
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES_FREE.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={isSignedIn ? '/app' : '/sign-up'}
              className="block w-full py-3 rounded-xl text-center font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all hover:scale-[1.02] text-sm"
            >
              {isSignedIn ? 'Go to app' : 'Start generating free'}
            </Link>
          </div>
        </div>

        {/* Paid plans teaser */}
        <div className="mt-12 p-5 rounded-xl bg-[#0d0d0d] border border-white/[0.06] text-center">
          <p className="text-zinc-500 text-sm">
            Paid plans with advanced features are coming soon.{' '}
            <span className="text-zinc-400">Enjoy unlimited free generation in the meantime.</span>
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-black text-white mb-8 text-center">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is there really no limit?',
                a: 'During beta, yes — generate as many as you want. We may introduce limits later and will give you notice.',
              },
              {
                q: 'What format are textures in?',
                a: 'All textures are exported as PNG at 1024×1024 — ready for video editors, game engines, and 3D software.',
              },
              {
                q: 'Will I lose my textures when paid plans launch?',
                a: 'No. Your generated textures are stored in your account permanently.',
              },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-xl bg-[#0d0d0d] border border-white/[0.06]">
                <p className="text-white font-semibold text-sm mb-2">{item.q}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
