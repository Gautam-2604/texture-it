'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GeneratingLoaderProps {
  visible: boolean
}

export function GeneratingLoader({ visible }: GeneratingLoaderProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080808]/90 backdrop-blur-md"
        >
          {/* Animated gradient blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl"
              animate={{ x: [0, 80, -40, 0], y: [0, -60, 80, 0], scale: [1, 1.2, 0.8, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl"
              animate={{ x: [0, -60, 40, 0], y: [0, 60, -40, 0], scale: [1, 0.8, 1.3, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
            <motion.div
              className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-pink-600/15 blur-3xl"
              animate={{ x: [0, 40, -80, 0], y: [0, -80, 40, 0], scale: [1, 1.4, 0.9, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            />
          </div>

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Spinner ring */}
            <div className="relative w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 border-r-blue-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-transparent border-b-pink-500 border-l-violet-500"
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </div>

            <div className="text-center">
              <motion.p
                className="text-2xl font-bold text-white mb-2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Weaving your texture
              </motion.p>
              <p className="text-zinc-500 text-sm font-mono">
                AI is crafting a seamless 1024×1024 image
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-500"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
