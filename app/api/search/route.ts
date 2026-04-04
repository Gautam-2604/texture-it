import { NextRequest, NextResponse } from 'next/server'

export interface TextureAsset {
  id: string
  name: string
  categories: string[]
  thumb: string
  downloadUrl: string
  pageUrl: string
  source: 'polyhaven' | 'ambientcg'
  sourceLabel: string
}

// ── Poly Haven ────────────────────────────────────────────────────────────────
interface PolyHavenAsset {
  name: string
  categories: string[]
  tags: string[]
}

async function searchPolyHaven(q: string): Promise<TextureAsset[]> {
  const res = await fetch('https://api.polyhaven.com/assets?type=textures', {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []

  const all: Record<string, PolyHavenAsset> = await res.json()

  return Object.entries(all)
    .filter(([slug, data]) => {
      if (!q) return true
      return (
        slug.replace(/_/g, ' ').includes(q) ||
        (data.name && data.name.toLowerCase().includes(q)) ||
        (data.categories && data.categories.some((c) => c.toLowerCase().includes(q))) ||
        (data.tags && data.tags.some((t) => t.toLowerCase().includes(q)))
      )
    })
    .slice(0, 12)
    .map(([slug, data]) => ({
      id: `ph_${slug}`,
      name: data.name || slug.replace(/_/g, ' '),
      categories: data.categories || [],
      thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${slug}.png?height=400`,
      downloadUrl: `/api/download/asset?source=polyhaven&id=${slug}`,
      pageUrl: `https://polyhaven.com/a/${slug}`,
      source: 'polyhaven' as const,
      sourceLabel: 'Poly Haven',
    }))
}

// ── AmbientCG ─────────────────────────────────────────────────────────────────
interface AmbientCGAsset {
  assetId: string
  displayData?: { name?: string; tags?: string[] }
}

async function searchAmbientCG(q: string): Promise<TextureAsset[]> {
  const params = new URLSearchParams({
    type: 'Material',
    include: 'displayData',
    limit: '12',
    sort: 'Popular',
    ...(q ? { q } : {}),
  })

  const res = await fetch(`https://ambientcg.com/api/v2/full_json?${params}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []

  const data: { foundAssets?: AmbientCGAsset[] } = await res.json()
  const assets = data.foundAssets ?? []

  return assets.map((a) => ({
    id: `acg_${a.assetId}`,
    name: a.displayData?.name ?? a.assetId,
    categories: a.displayData?.tags ?? [],
    thumb: `https://acg-media.struffelproductions.com/file/ambientcg-web/media/sphere/${a.assetId}_PREVIEW.jpg`,
    downloadUrl: `/api/download/asset?source=ambientcg&id=${a.assetId}`,
    pageUrl: `https://ambientcg.com/view?id=${a.assetId}`,
    source: 'ambientcg' as const,
    sourceLabel: 'AmbientCG',
  }))
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const q = query.toLowerCase().trim()

  const [polyResults, acgResults] = await Promise.allSettled([
    searchPolyHaven(q),
    searchAmbientCG(q),
  ])

  const results: TextureAsset[] = [
    ...(polyResults.status === 'fulfilled' ? polyResults.value : []),
    ...(acgResults.status === 'fulfilled' ? acgResults.value : []),
  ]

  return NextResponse.json({ results })
}
