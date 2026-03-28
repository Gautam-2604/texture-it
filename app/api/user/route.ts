import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
    const user = await getOrCreateUser(userId, email)

    return NextResponse.json({
      plan: user.plan,
      textureCount: user.texture_count,
      freeLimit: 5,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/user]', err)
    }
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
