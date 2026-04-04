import { NextRequest, NextResponse } from 'next/server'

export interface LiveResult {
  id: string
  name: string
  description: string
  thumb: string | null
  downloadUrl: string | null
  pageUrl: string
  source: string
  canDownload: boolean
}

const TEXTURE_SITES = [
  'polyhaven.com',
  'ambientcg.com',
  '3dtextures.me',
  'freepbr.com',
  'cgbookcase.com',
  'sharetextures.com',
  'publicdomaintextures.net',
  'texturecan.com',
]

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

interface ParsedAsset {
  downloadUrl: string | null
  thumbUrl: string | null
  isSpecificPage: boolean
}

// Per-site strict validation. Returns downloadUrl + thumbUrl where known,
// isSpecificPage=false for homepages/category/search pages.
function parseAssetUrl(url: string): ParsedAsset {
  const none: ParsedAsset = { downloadUrl: null, thumbUrl: null, isSpecificPage: false }
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '')
    const segments = path.split('/').filter(Boolean)

    // ── Poly Haven ──────────────────────────────────────────────────────────────
    if (u.hostname.includes('polyhaven.com')) {
      const m = path.match(/^\/a\/([a-z0-9_]+)$/)
      if (m) return {
        downloadUrl: `/api/download/asset?source=polyhaven&id=${m[1]}`,
        thumbUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${m[1]}.png?height=400`,
        isSpecificPage: true,
      }
      return none
    }

    // ── AmbientCG ───────────────────────────────────────────────────────────────
    if (u.hostname.includes('ambientcg.com')) {
      const id = u.searchParams.get('id')
      if (path === '/view' && id) return {
        downloadUrl: `/api/download/asset?source=ambientcg&id=${id}`,
        thumbUrl: `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-PNG/${id}.png`,
        isSpecificPage: true,
      }
      return none
    }

    // ── 3DTextures ──────────────────────────────────────────────────────────────
    if (u.hostname.includes('3dtextures.me')) {
      const GENERIC = ['category', 'tag', 'page', 'author', 'search']
      const isSpecific = segments.length >= 1 && !segments.some(s => GENERIC.includes(s))
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── FreePBR ─────────────────────────────────────────────────────────────────
    if (u.hostname.includes('freepbr.com')) {
      const GENERIC = ['category', 'page', 'tag', 'search']
      const isSpecific = segments.length >= 1 && !segments.some(s => GENERIC.includes(s))
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── CGBookcase ──────────────────────────────────────────────────────────────
    if (u.hostname.includes('cgbookcase.com')) {
      const isSpecific = segments.length >= 2 && segments[0] === 'textures'
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── ShareTextures ───────────────────────────────────────────────────────────
    if (u.hostname.includes('sharetextures.com')) {
      const isSpecific = segments.length >= 3 && segments[0] === 'textures'
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── PublicDomainTextures ────────────────────────────────────────────────────
    if (u.hostname.includes('publicdomaintextures.net')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 }
    }

    // ── TextureCan ──────────────────────────────────────────────────────────────
    if (u.hostname.includes('texturecan.com')) {
      const isSpecific = segments.includes('details') && segments.length >= 2
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 }
  } catch {
    return none
  }
}

// Fetch only the <head> of a page and extract og:image.
// Streams until </head> or 12 KB, then aborts — fast and cheap.
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Textura/1.0)', Accept: 'text/html' },
      next: { revalidate: 86400 }, // cache OG image per URL for 24h
    })
    clearTimeout(timer)
    if (!res.ok) return null

    const reader = res.body?.getReader()
    if (!reader) return null

    const decoder = new TextDecoder()
    let html = ''
    try {
      while (html.length < 12000) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        if (html.includes('</head>') || html.includes('<body')) break
      }
    } finally {
      reader.cancel().catch(() => {})
    }

    // og:image appears in either attribute order
    const m =
      html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return m?.[1]?.trim() ?? null
  } catch {
    return null
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–|]\s*(Poly Haven|AmbientCG|3DTextures|FreePBR|CGBookcase|ShareTextures|Free PBR|Texture Can).*/i, '')
    .replace(/\s*\|\s*.*$/, '')
    .trim()
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (!query.trim()) return NextResponse.json({ results: [] })

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SERPER_API_KEY not configured' }, { status: 503 })
  }

  const siteFilter = TEXTURE_SITES.map((s) => `site:${s}`).join(' OR ')
  const searchQuery = `${query} seamless PBR texture free (${siteFilter})`

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: searchQuery, num: 20 }),
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Live search failed' }, { status: 502 })
  }

  const data = await res.json()
  const organic: Array<{ link: string; title: string; snippet: string; imageUrl?: string }> =
    data.organic ?? []

  const filtered = organic
    .filter((r) => TEXTURE_SITES.some((s) => getDomain(r.link).endsWith(s)))
    .map((r) => ({ ...parseAssetUrl(r.link), r }))
    .filter(({ isSpecificPage }) => isSpecificPage)

  // Resolve thumbnails: known CDN pattern → Serper imageUrl → OG scrape (parallel, 3s timeout)
  const results: LiveResult[] = await Promise.all(
    filtered.map(async ({ downloadUrl, thumbUrl, r }) => {
      const knownThumb = thumbUrl ?? r.imageUrl ?? null
      const resolvedThumb = knownThumb ?? await fetchOgImage(r.link)
      return {
        id: r.link,
        name: cleanTitle(r.title),
        description: r.snippet ?? '',
        thumb: resolvedThumb,
        downloadUrl,
        pageUrl: r.link,
        source: getDomain(r.link),
        canDownload: !!downloadUrl,
      }
    })
  )

  return NextResponse.json({ results })
}
