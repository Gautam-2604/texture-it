import { NextResponse } from 'next/server'

// Texture history is session-only while auth is disabled — return empty.
export async function GET() {
  return NextResponse.json({ textures: [] })
}
