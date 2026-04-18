import { NextResponse } from 'next/server'

// Generated textures are downloaded directly from their storage URL in TextureCard.
// This endpoint is kept as a stub for forward-compatibility.
export async function GET() {
  return NextResponse.json({ error: 'Not available' }, { status: 404 })
}
