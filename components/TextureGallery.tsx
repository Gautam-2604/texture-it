'use client'
import React from 'react'
import { TextureCard } from './TextureCard'
import { motion, AnimatePresence } from 'framer-motion'

interface Texture {
  id: string
  prompt: string
  url: string
  createdAt: string
}

interface TextureGalleryProps {
  textures: Texture[]
  newTextureId?: string | null
}

export function TextureGallery({ textures, newTextureId }: TextureGalleryProps) {
  if (textures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">No textures yet. Generate your first one above.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {textures.map((texture) => (
          <motion.div
            key={texture.id}
            layout
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <TextureCard
              {...texture}
              isNew={texture.id === newTextureId}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
