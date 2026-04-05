import { NextRequest, NextResponse } from 'next/server'

export interface LiveResult {
  id: string
  name: string
  description: string
  thumb: string | null
  downloadUrl: string | null
  pageUrl: string
  source: string
  assetType: '2d' | '3d'
  canDownload: boolean
}

const THREE_D_SITES = [
  'polyhaven.com',
  'ambientcg.com',
  '3dtextures.me',
  'freepbr.com',
  'cgbookcase.com',
  'sharetextures.com',
  'publicdomaintextures.net',
  'texturecan.com',
]

const TWO_D_SITES = [
  'opengameart.org',
  'kenney.nl',
  'game-icons.net',
  'craftpix.net',
  'itch.io',
]

const ALL_SITES = [...THREE_D_SITES, ...TWO_D_SITES]

const TWO_D_SIGNALS = [
  'sprite', 'sprites', '2d', 'icon', 'icons', 'tile', 'tiles', 'tileset',
  'spritesheet', 'cartoon', 'pixel art', 'pixelart', 'character sprite',
  'game asset', 'game assets', 'ui asset', 'ui element', 'isometric',
  'animation', 'sheet', 'illustration', 'clipart',
]

const THREE_D_SIGNALS = [
  'texture', 'pbr', 'material', 'seamless', 'tileable', 'normal map',
  'roughness', 'albedo', 'displacement', 'bump', 'specular', 'metalness',
  'diffuse', 'ao map',
]

type AssetMode = '2d' | '3d' | 'both'

function detectMode(q: string): AssetMode {
  const lower = q.toLowerCase()
  const is2d = TWO_D_SIGNALS.some((s) => lower.includes(s))
  const is3d = THREE_D_SIGNALS.some((s) => lower.includes(s))
  if (is2d && !is3d) return '2d'
  if (is3d && !is2d) return '3d'
  return 'both'
}

// Strip common natural-language filler so search engines see only the meaningful terms
const FILLER_PATTERNS = [
  /\b(i need|i want|i'm looking for|looking for|find me|give me|show me|please find|can you find|please give)\b/gi,
  /\b(something (that looks like|like|similar to))\b/gi,
  /\b(suitable for|perfect for|good for|used (in|for)|to use (in|for|as))\b/gi,
  /\b(for (a|an|the|my|this|that|some))\b/gi,
  /\b(in (a|an|the))\b/gi,
  /\b(that (is|are|looks?|seems?))\b/gi,
  /\b(kind of|sort of|type of)\b/gi,
  /\b(please|thanks|thank you)\b/gi,
]

function cleanQuery(q: string): string {
  let result = q
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, ' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function buildSearchQuery(q: string): { serperQuery: string; sites: string[]; mode: AssetMode } {
  const cleaned = cleanQuery(q)
  const mode = detectMode(q)

  let sites: string[]
  let suffix: string

  if (mode === '2d') {
    sites = TWO_D_SITES
    suffix = 'free 2D game asset'
  } else if (mode === '3d') {
    sites = THREE_D_SITES
    suffix = 'free texture'
  } else {
    sites = ALL_SITES
    suffix = 'free texture asset'
  }

  const siteFilter = sites.map((s) => `site:${s}`).join(' OR ')
  return {
    serperQuery: `${cleaned} ${suffix} (${siteFilter})`,
    sites,
    mode,
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function siteAssetType(domain: string): '2d' | '3d' {
  return TWO_D_SITES.some((s) => domain.endsWith(s)) ? '2d' : '3d'
}

interface ParsedAsset {
  downloadUrl: string | null
  thumbUrl: string | null
  isSpecificPage: boolean
}

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
      const isSpecific = segments.length >= 1 && !segments.some((s) => GENERIC.includes(s))
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── FreePBR ─────────────────────────────────────────────────────────────────
    if (u.hostname.includes('freepbr.com')) {
      const GENERIC = ['category', 'page', 'tag', 'search']
      const isSpecific = segments.length >= 1 && !segments.some((s) => GENERIC.includes(s))
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

    // ── OpenGameArt ─────────────────────────────────────────────────────────────
    if (u.hostname.includes('opengameart.org')) {
      const isSpecific = segments.length >= 2 && segments[0] === 'content'
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── Kenney ───────────────────────────────────────────────────────────────────
    if (u.hostname.includes('kenney.nl')) {
      const isSpecific = segments[0] === 'assets' && segments.length >= 2
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── Game-Icons ───────────────────────────────────────────────────────────────
    if (u.hostname.includes('game-icons.net')) {
      // e.g. https://game-icons.net/1x1/lorc/sword.html
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 3 }
    }

    // ── CraftPix ──────────────────────────────────────────────────────────────────
    if (u.hostname.includes('craftpix.net')) {
      const isSpecific = segments.length >= 2 && (segments[0] === 'product' || segments[0] === 'freebies')
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: isSpecific }
    }

    // ── itch.io ────────────────────────────────────────────────────────────────────
    if (u.hostname.includes('itch.io')) {
      if (u.hostname === 'itch.io') return none // browse/category pages
      // author.itch.io/asset-slug
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 1 }
    }

    return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 }
  } catch {
    return none
  }
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Textura/1.0)', Accept: 'text/html' },
      next: { revalidate: 86400 },
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
    .replace(
      /\s*[-–|]\s*(Poly Haven|AmbientCG|3DTextures|FreePBR|CGBookcase|ShareTextures|Free PBR|Texture Can|OpenGameArt|Kenney|Game Icons|CraftPix|itch\.io).*/i,
      ''
    )
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

  const { serperQuery, sites } = buildSearchQuery(query)

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: serperQuery, num: 20 }),
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Live search failed' }, { status: 502 })
  }

  const data = await res.json()
  const organic: Array<{ link: string; title: string; snippet: string; imageUrl?: string }> =
    data.organic ?? []

  const filtered = organic
    .filter((r) => sites.some((s) => getDomain(r.link).endsWith(s)))
    .map((r) => ({ ...parseAssetUrl(r.link), r }))
    .filter(({ isSpecificPage }) => isSpecificPage)

  const results: LiveResult[] = await Promise.all(
    filtered.map(async ({ downloadUrl, thumbUrl, r }) => {
      const domain = getDomain(r.link)
      const knownThumb = thumbUrl ?? r.imageUrl ?? null
      const resolvedThumb = knownThumb ?? await fetchOgImage(r.link)
      return {
        id: r.link,
        name: cleanTitle(r.title),
        description: r.snippet ?? '',
        thumb: resolvedThumb,
        downloadUrl,
        pageUrl: r.link,
        source: domain,
        assetType: siteAssetType(domain),
        canDownload: !!downloadUrl,
      }
    })
  )

  return NextResponse.json({ results })
}
