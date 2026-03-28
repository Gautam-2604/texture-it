import { NextResponse } from 'next/server'

export async function POST() {
  // Stripe not yet configured — paid plans coming soon
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Paid plans are not available yet. Enjoy unlimited free access!' },
      { status: 503 }
    )
  }

  const { auth, currentUser } = await import('@clerk/nextjs/server')
  const { createCheckoutSession } = await import('@/lib/stripe')

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    const url = await createCheckoutSession(userId, email, priceId, appUrl)
    return NextResponse.json({ url })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/checkout]', err)
    }
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
