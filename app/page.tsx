import React from 'react'
import Link from 'next/link'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { Spotlight } from '@/components/ui/spotlight'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { HeroSearchBar } from '@/components/HeroSearchBar'

const EXAMPLE_TEXTURES = [
  { prompt: 'Cracked obsidian with glowing lava veins', color: 'from-orange-950 to-red-950' },
  { prompt: 'Mossy ancient stone bricks, wet with rain', color: 'from-green-950 to-teal-950' },
  { prompt: 'Brushed rose gold metallic surface', color: 'from-pink-950 to-rose-950' },
  { prompt: 'Neon circuit board, cyberpunk blue', color: 'from-blue-950 to-cyan-950' },
  { prompt: 'Weathered leather, deep burgundy', color: 'from-red-950 to-purple-950' },
  { prompt: 'Hammered copper with green oxidation', color: 'from-emerald-950 to-teal-950' },
]

const FEATURES = [
  { icon: '🔍', title: 'Free asset search', desc: 'Browse thousands of CC0 textures and 2D game assets — no cost, no attribution required.' },
  { icon: '🔄', title: 'Seamless & tileable', desc: 'Every texture tiles perfectly with no seams' },
  { icon: '🎨', title: '1024×1024 resolution', desc: 'High-res AI outputs ready for professional use' },
  { icon: '⚡', title: 'AI generation', desc: 'Generate custom textures from text in under 10 seconds' },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#080808] overflow-hidden">
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Textura</span>
        </div>
        <Link
          href="/app"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Open app
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-32">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(124, 58, 237, 0.3)" />
        <BackgroundBeams className="absolute inset-0" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-8 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Find &amp; Generate Game Textures
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6">
            <span className="block text-white">Find the perfect</span>
            <span className="block">
              <AnimatedGradientText className="text-6xl sm:text-7xl lg:text-8xl font-black">
                texture or asset.
              </AnimatedGradientText>
            </span>
          </h1>

          <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Search thousands of free CC0 textures from Poly Haven, AmbientCG, Subtle Patterns, and more —
            or describe any surface and generate it with AI in seconds.
          </p>

          <HeroSearchBar />
          <p className="text-zinc-600 text-sm mt-6">Free · No account required</p>
        </div>
      </section>

      {/* Example texture cards */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {EXAMPLE_TEXTURES.map((ex, i) => (
              <div
                key={i}
                className={`aspect-square rounded-xl bg-gradient-to-br ${ex.color} border border-white/5 flex items-end p-2 overflow-hidden relative group cursor-default`}
              >
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <filter id={`noise-${i}`}>
                      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
                      <feColorMatrix type="saturate" values="0" />
                    </filter>
                    <rect width="100%" height="100%" filter={`url(#noise-${i})`} />
                  </svg>
                </div>
                <p className="relative z-10 text-[9px] text-white/40 leading-tight line-clamp-2 group-hover:text-white/70 transition-colors">
                  {ex.prompt}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-zinc-600 text-xs mt-4 font-mono">
            example prompts — search for free assets or generate with AI
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center text-white mb-4">Everything you need</h2>
          <p className="text-zinc-500 text-center mb-16 max-w-xl mx-auto">
            Search free CC0 assets or generate custom textures — built for game devs, 3D artists, and designers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/[0.08] hover:border-purple-500/30 transition-colors group"
              >
                <div className="text-3xl mb-4">{feat.icon}</div>
                <h3 className="text-white font-bold mb-2 group-hover:text-purple-300 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-px rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(59,130,246,0.5), rgba(236,72,153,0.5))' }}>
            <div className="bg-[#0a0a0a] rounded-3xl p-12">
              <h2 className="text-4xl font-black text-white mb-4">Ready to find your texture?</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Search thousands of free CC0 assets or generate custom textures with AI — no account, no credit card.
              </p>
              <Link
                href="/app"
                className="inline-block px-10 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] transition-all duration-300 hover:scale-105"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="text-zinc-600 text-sm">Textura</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
