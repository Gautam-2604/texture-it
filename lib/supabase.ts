import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — not instantiated at module load time (avoids build errors)
let _client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase env vars not configured')
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}

// Export for callers that need direct access (e.g. stripe webhook)
export const supabaseAdmin = { get from() { return db().from.bind(db()) }, get rpc() { return db().rpc.bind(db()) } }

const STORAGE_BUCKET = 'textures'

export async function uploadTextureToStorage(
  userId: string,
  imageBuffer: ArrayBuffer
): Promise<string> {
  const filename = `${userId}/${Date.now()}.png`

  const { error } = await db()
    .storage
    .from(STORAGE_BUCKET)
    .upload(filename, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = db().storage.from(STORAGE_BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

export type UserRecord = {
  id: string
  email: string
  plan: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  texture_count: number
  created_at: string
}

export type TextureRecord = {
  id: string
  user_id: string
  prompt: string
  enhanced_prompt: string
  blob_url: string
  created_at: string
}

export async function getOrCreateUser(userId: string, email: string): Promise<UserRecord> {
  const { data: existing } = await db().from('users').select('*').eq('id', userId).single()
  if (existing) return existing

  const { data: created, error } = await db()
    .from('users')
    .insert({ id: userId, email, plan: 'free', texture_count: 0 })
    .select()
    .single()

  if (error) throw new Error(`Failed to create user: ${error.message}`)
  return created
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const { data } = await db().from('users').select('*').eq('id', userId).single()
  return data
}

export async function incrementTextureCount(userId: string): Promise<void> {
  const { error } = await db().rpc('increment_texture_count', { user_id_param: userId })
  if (error) {
    const user = await getUserById(userId)
    if (user) {
      await db().from('users').update({ texture_count: user.texture_count + 1 }).eq('id', userId)
    }
  }
}

export async function saveTexture(data: {
  user_id: string
  prompt: string
  enhanced_prompt: string
  blob_url: string
}): Promise<TextureRecord> {
  const { data: texture, error } = await db().from('textures').insert(data).select().single()
  if (error) throw new Error(`Failed to save texture: ${error.message}`)
  return texture
}

export async function getUserTextures(userId: string): Promise<TextureRecord[]> {
  const { data, error } = await db()
    .from('textures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`Failed to fetch textures: ${error.message}`)
  return data || []
}

export async function getTextureById(textureId: string, userId: string): Promise<TextureRecord | null> {
  const { data } = await db()
    .from('textures')
    .select('*')
    .eq('id', textureId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function updateUserPlan(
  userId: string,
  plan: 'free' | 'pro',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const updates: Partial<UserRecord> = { plan }
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
  if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId
  await db().from('users').update(updates).eq('id', userId)
}

export async function getUserByStripeCustomerId(customerId: string): Promise<UserRecord | null> {
  const { data } = await db()
    .from('users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()
  return data
}
