'use client'
import React, { useRef } from 'react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

export function MovingBorder({
  children,
  duration = 2000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode
  as?: React.ElementType
  containerClassName?: string
  borderClassName?: string
  duration?: number
  className?: string
  rx?: string
  ry?: string
  [key: string]: unknown
}) {
  const pathRef = useRef<SVGRectElement | null>(null)
  const progress = useMotionValue<number>(0)

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength()
    if (length) {
      const pxPerMillisecond = length / duration
      progress.set((time * pxPerMillisecond) % length)
    }
  })

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.x ?? 0)
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.y ?? 0)

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <div
      className={cn('relative text-xl p-[1px] overflow-hidden', (otherProps as { containerClassName?: string }).containerClassName)}
      style={{ borderRadius: rx ? `${rx}px` : undefined }}
    >
      <div className="absolute inset-0">
        <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute h-full w-full" width="100%" height="100%">
          <rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
        </svg>
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'inline-block',
            transform,
          }}
        >
          <div
            className={cn('h-20 w-20 opacity-[0.8] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-blue-500 to-transparent blur-sm', (otherProps as { borderClassName?: string }).borderClassName)}
          />
        </motion.div>
      </div>
      <div
        className={cn('relative bg-[#0a0a0a] border border-white/10', (otherProps as { className?: string }).className)}
        style={{ borderRadius: rx ? `calc(${rx}px - 1px)` : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
