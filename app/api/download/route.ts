import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { downloadSchema } from '@/lib/schemas'
import { getDownloadRatelimit } from '@/lib/ratelimit'
import { getTextureById, downloadTextureFromStorage } from '@/lib/supabase'

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

    // Download via Supabase service-role client (bypasses public URL quirks)
    const file = await downloadTextureFromStorage(texture.blob_url)
    if (!file) {
      return NextResponse.json({ error: 'Texture file not found in storage' }, { status: 404 })
    }

    const ext = file.contentType.includes('png') ? 'png' : 'jpg'
    const filename = `textura-${parsed.data.id.slice(0, 8)}.${ext}`
    const buffer = await file.data.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': file.contentType,
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
