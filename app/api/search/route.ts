import { NextRequest, NextResponse } from 'next/server'

export interface TextureAsset {
  id: string
  name: string
  categories: string[]
  thumb: string
  downloadUrl: string | null
  pageUrl: string
  source: 'polyhaven' | 'ambientcg' | 'opengameart' | 'kenney'
  sourceLabel: string
  assetDimension: '2d' | '3d'
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
      assetDimension: '3d' as const,
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
    thumb: `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-PNG/${a.assetId}.png`,
    downloadUrl: `/api/download/asset?source=ambientcg&id=${a.assetId}`,
    pageUrl: `https://ambientcg.com/view?id=${a.assetId}`,
    source: 'ambientcg' as const,
    sourceLabel: 'AmbientCG',
    assetDimension: '3d' as const,
  }))
}

// ── OpenGameArt ───────────────────────────────────────────────────────────────
interface OGARow {
  title: string
  url: string
  thumbnail_url: string
  tags: string[]
}

// OGA art types: 0 = all, 3 = Textures, 9 = 2D Art (sprites — skip)
async function fetchOGA(q: string, artType: string, limit: number): Promise<OGARow[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const params = new URLSearchParams({ field_art_type: artType, count: String(limit) })
    if (q) params.set('query', q)

    const res = await fetch(`https://opengameart.org/api/search?${params}`, {
      signal: controller.signal,
      next: { revalidate: 1800 },
    })
    clearTimeout(timeout)
    if (!res.ok) return []

    const data: { rows?: OGARow[] } = await res.json()
    return data?.rows ?? []
  } catch {
    clearTimeout(timeout)
    return []
  }
}

async function searchOpenGameArt(q: string): Promise<TextureAsset[]> {
  // type 3 = Textures only; alt query with "texture" keyword ensures broader coverage
  const altQ = q ? `${q} texture` : 'seamless texture pattern'

  const [rows3, rows0] = await Promise.all([
    fetchOGA(q, '3', 20),
    fetchOGA(altQ, '0', 20),
  ])

  const seen = new Set<string>()
  const merged: OGARow[] = []
  for (const row of [...rows3, ...rows0]) {
    const key = row.url ?? row.title
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(row)
    }
  }

  return merged.slice(0, 20).map((row) => {
    const slug = row.url?.replace(/^\/content\//, '') ?? row.title.toLowerCase().replace(/\s+/g, '-')
    return {
      id: `oga_${slug}`,
      name: row.title,
      categories: Array.isArray(row.tags) ? row.tags : [],
      thumb: row.thumbnail_url ?? '',
      downloadUrl: null,
      pageUrl: row.url?.startsWith('http') ? row.url : `https://opengameart.org${row.url}`,
      source: 'opengameart' as const,
      sourceLabel: 'OpenGameArt',
      assetDimension: '2d' as const,
    }
  })
}

// ── Kenney.nl ─────────────────────────────────────────────────────────────────
// Kenney publishes every asset pack as a GitHub repo under the kenney-nl org.
// Their thumbnail CDN pattern: kenney.nl/media/pages/assets/{slug}/thumbnail.png
// Their website URL pattern:   kenney.nl/assets/{slug}
interface GHRepo {
  name: string
  description: string | null
  html_url: string
  stargazers_count: number
  topics: string[]
}

async function searchKenney(q: string): Promise<TextureAsset[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    let url: string
    if (q) {
      // Searching specific query against kenney-nl org repos
      url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}+org:kenney-nl&per_page=20&sort=stars`
    } else {
      // Browse mode: return most-starred packs
      url = 'https://api.github.com/orgs/kenney-nl/repos?per_page=30&sort=pushed&type=public'
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 7200 },
    })
    clearTimeout(timeout)
    if (!res.ok) return []

    const data = await res.json()
    const repos: GHRepo[] = q ? (data.items ?? []) : (Array.isArray(data) ? data : [])

    return repos
      .filter((r) => r.name && r.name !== '.github') // skip meta repos
      .slice(0, 16)
      .map((r) => {
        const slug = r.name.toLowerCase()
        const friendlyName = r.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        const categories = r.topics?.length ? r.topics : (r.description ? [r.description.split(' ')[0]] : [])
        return {
          id: `kn_${slug}`,
          name: friendlyName,
          categories,
          thumb: `https://kenney.nl/media/pages/assets/${slug}/thumbnail.png`,
          downloadUrl: null,
          pageUrl: `https://kenney.nl/assets/${slug}`,
          source: 'kenney' as const,
          sourceLabel: 'Kenney',
          assetDimension: '2d' as const,
        }
      })
  } catch {
    clearTimeout(timeout)
    return []
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const q = query.toLowerCase().trim()

  const [polyResults, acgResults, ogaResults, kenneyResults] = await Promise.allSettled([
    searchPolyHaven(q),
    searchAmbientCG(q),
    searchOpenGameArt(q),
    searchKenney(q),
  ])

  const results: TextureAsset[] = [
    ...(polyResults.status === 'fulfilled' ? polyResults.value : []),
    ...(acgResults.status === 'fulfilled' ? acgResults.value : []),
    ...(ogaResults.status === 'fulfilled' ? ogaResults.value : []),
    ...(kenneyResults.status === 'fulfilled' ? kenneyResults.value : []),
  ]

  return NextResponse.json({ results })
}
