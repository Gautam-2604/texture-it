import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import {
  getUserByStripeCustomerId,
  updateUserPlan,
  supabaseAdmin,
} from '@/lib/supabase'

export async function POST(req: Request) {
  const stripe = getStripe()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.customer) break

        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer.id
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? undefined

        await updateUserPlan(userId, 'pro', customerId, subscriptionId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const user = await getUserByStripeCustomerId(customerId)
        if (!user) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        await updateUserPlan(user.id, isActive ? 'pro' : 'free', customerId, sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const user = await getUserByStripeCustomerId(customerId)
        if (!user) break

        await supabaseAdmin
          .from('users')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('id', user.id)
        break
      }

      case 'invoice.payment_failed': {
        // Could send an email notification here
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/webhooks/stripe]', err)
    }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
