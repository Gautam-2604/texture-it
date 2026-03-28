import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserTextures } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const textures = await getUserTextures(userId)
    // Strip internal blob URLs from response — client should use /api/download
    const safe = textures.map((t) => ({
      id: t.id,
      prompt: t.prompt,
      createdAt: t.created_at,
      // Return URL for display only (not for download link)
      url: t.blob_url,
    }))

    return NextResponse.json({ textures: safe })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/textures]', err)
    }
    return NextResponse.json({ error: 'Failed to fetch textures' }, { status: 500 })
  }
}
