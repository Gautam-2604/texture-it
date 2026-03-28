import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { downloadSchema } from '@/lib/schemas'
import { getDownloadRatelimit } from '@/lib/ratelimit'
import { getTextureById } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ratelimit = getDownloadRatelimit()
    const { success } = await ratelimit.limit(userId)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Parse + validate query param
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const parsed = downloadSchema.safeParse({ id })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid texture ID' }, { status: 400 })
    }

    // Verify ownership
    const texture = await getTextureById(parsed.data.id, userId)
    if (!texture) {
      return NextResponse.json({ error: 'Texture not found' }, { status: 404 })
    }

    // Stream from Vercel Blob
    const blobRes = await fetch(texture.blob_url)
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch texture' }, { status: 502 })
    }

    const contentType = blobRes.headers.get('content-type') ?? 'image/webp'
    const filename = `textura-${parsed.data.id.slice(0, 8)}.webp`

    return new Response(blobRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/download]', err)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
