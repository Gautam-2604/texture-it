import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/components/PostHogProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })

export const metadata: Metadata = {
  title: 'Textura — AI Texture Generator for Video Editors',
  description:
    'Generate seamless, high-resolution tileable textures with AI. Describe any surface in natural language and get a production-ready 1024×1024 texture in seconds.',
  openGraph: {
    title: 'Textura',
    description: 'AI-powered seamless texture generation',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <body className="bg-[#080808] text-white antialiased min-h-screen font-sans">
          <PostHogProvider>{children}</PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
