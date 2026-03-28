import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { generateSchema } from '@/lib/schemas'
import { getGenerateRatelimit } from '@/lib/ratelimit'
import { enhancePrompt, generateTexture } from '@/lib/openrouter'
import { getOrCreateUser, saveTexture, incrementTextureCount, uploadTextureToStorage } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit
    const ratelimit = getGenerateRatelimit()
    const { success: rateLimitOk, limit, remaining } = await ratelimit.limit(userId)
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

    // 3. Parse + validate body
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

    // 4. Ensure user record exists (no usage gate — everyone generates freely)
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
    await getOrCreateUser(userId, email)

    // 5. Enhance prompt
    const enhancedPrompt = enhancePrompt(prompt)

    // 6. Generate image via OpenRouter
    let imageBuffer: ArrayBuffer
    try {
      imageBuffer = await generateTexture(enhancedPrompt)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 502 })
    }

    // 7. Upload to Supabase Storage
    let storageUrl: string
    try {
      storageUrl = await uploadTextureToStorage(userId, imageBuffer)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Storage upload failed'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // 8. Save record + track usage count (for analytics, not gating)
    const texture = await saveTexture({
      user_id: userId,
      prompt,
      enhanced_prompt: enhancedPrompt,
      blob_url: storageUrl,
    })
    await incrementTextureCount(userId)

    return NextResponse.json({
      id: texture.id,
      url: storageUrl,
      prompt,
      createdAt: texture.created_at,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/generate]', err)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
