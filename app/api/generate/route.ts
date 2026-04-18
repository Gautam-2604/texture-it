import { NextResponse } from 'next/server'
import { generateSchema } from '@/lib/schemas'
import { getGenerateRatelimit } from '@/lib/ratelimit'
import { enhancePrompt, generateTexture } from '@/lib/openrouter'
import { uploadTextureToStorage } from '@/lib/supabase'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ratelimit = getGenerateRatelimit()
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'anonymous'
    const { success: rateLimitOk, limit, remaining } = await ratelimit.limit(ip)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      )
    }

    // Parse + validate body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { prompt } = parsed.data

    // Enhance prompt
    const enhancedPrompt = enhancePrompt(prompt)

    // Generate image via OpenRouter
    let imageBuffer: ArrayBuffer
    try {
      imageBuffer = await generateTexture(enhancedPrompt)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 502 })
    }

    // Upload to Supabase Storage under anonymous path
    let storageUrl: string
    try {
      storageUrl = await uploadTextureToStorage('anonymous', imageBuffer)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Storage upload failed'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({
      id: randomUUID(),
      url: storageUrl,
      prompt,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/generate]', err)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
