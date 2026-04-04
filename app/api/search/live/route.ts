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

// Per-site strict validation. Returns downloadUrl if we can proxy it,
// isSpecificPage=false if the URL is a homepage/category/search page.
function parseAssetUrl(url: string): { downloadUrl: string | null; isSpecificPage: boolean } {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '')        // strip trailing slash
    const segments = path.split('/').filter(Boolean)   // ['a', 'aerial_asphalt_01']

    // ── Poly Haven ──────────────────────────────────────────────────────────────
    // Specific asset page: polyhaven.com/a/{slug}
    if (u.hostname.includes('polyhaven.com')) {
      const m = path.match(/^\/a\/([a-z0-9_]+)$/)
      if (m) return { downloadUrl: `/api/download/asset?source=polyhaven&id=${m[1]}`, isSpecificPage: true }
      return { downloadUrl: null, isSpecificPage: false }
    }

    // ── AmbientCG ───────────────────────────────────────────────────────────────
    // Specific: ambientcg.com/view?id={AssetId}
    if (u.hostname.includes('ambientcg.com')) {
      const id = u.searchParams.get('id')
      if (path === '/view' && id) {
        return { downloadUrl: `/api/download/asset?source=ambientcg&id=${id}`, isSpecificPage: true }
      }
      return { downloadUrl: null, isSpecificPage: false }
    }

    // ── 3DTextures ──────────────────────────────────────────────────────────────
    // Specific: /YYYY/MM/DD/name/ OR /name/ — reject /category/, /tag/, /page/
    if (u.hostname.includes('3dtextures.me')) {
      const GENERIC = ['category', 'tag', 'page', 'author', 'search']
      const isSpecific = segments.length >= 1 && !segments.some(s => GENERIC.includes(s))
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // ── FreePBR ─────────────────────────────────────────────────────────────────
    // Specific: /materials/{name} or /{name} — reject root and /category/
    if (u.hostname.includes('freepbr.com')) {
      const GENERIC = ['category', 'page', 'tag', 'search']
      const isSpecific = segments.length >= 1 && !segments.some(s => GENERIC.includes(s))
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // ── CGBookcase ──────────────────────────────────────────────────────────────
    // Specific: /textures/{name} (exactly 2 segments, first is 'textures')
    if (u.hostname.includes('cgbookcase.com')) {
      const isSpecific = segments.length >= 2 && segments[0] === 'textures'
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // ── ShareTextures ───────────────────────────────────────────────────────────
    // Specific: /textures/{category}/{name} (3+ segments)
    if (u.hostname.includes('sharetextures.com')) {
      const isSpecific = segments.length >= 3 && segments[0] === 'textures'
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // ── PublicDomainTextures ────────────────────────────────────────────────────
    if (u.hostname.includes('publicdomaintextures.net')) {
      const isSpecific = segments.length >= 2
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // ── TextureCan ──────────────────────────────────────────────────────────────
    if (u.hostname.includes('texturecan.com')) {
      const isSpecific = segments.includes('details') && segments.length >= 2
      return { downloadUrl: null, isSpecificPage: isSpecific }
    }

    // Unknown site in our list — accept if path is deep enough
    return { downloadUrl: null, isSpecificPage: segments.length >= 2 }
  } catch {
    return { downloadUrl: null, isSpecificPage: false }
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

  const results: LiveResult[] = organic
    .filter((r) => {
      const domain = getDomain(r.link)
      return TEXTURE_SITES.some((s) => domain.endsWith(s))
    })
    .map((r) => {
      const { downloadUrl, isSpecificPage } = parseAssetUrl(r.link)
      return { isSpecificPage, downloadUrl, r }
    })
    .filter(({ isSpecificPage }) => isSpecificPage)   // drop homepages & category pages
    .map(({ downloadUrl, r }) => ({
      id: r.link,
      name: cleanTitle(r.title),
      description: r.snippet ?? '',
      thumb: r.imageUrl ?? null,
      downloadUrl,
      pageUrl: r.link,
      source: getDomain(r.link),
      canDownload: !!downloadUrl,
    }))

  return NextResponse.json({ results })
}
