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

export interface SuggestedSite {
  name: string
  url: string
  description: string
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
  'craftpix.net',
  'itch.io',
]

const ALL_SITES = [...THREE_D_SITES, ...TWO_D_SITES]

const TWO_D_SIGNALS = [
  '2d', 'illustration', 'hand-drawn', 'hand drawn', 'hand painted',
  'watercolor', 'watercolour', 'painted', 'drawn', 'flat texture',
  'illustrated', 'cartoon texture', 'stylized texture', 'stylised texture',
  'digital painting', 'concept texture',
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

// ── Keyword Extractor ──────────────────────────────────────────────────────
// Strips stop words so Serper always gets concise, meaningful terms
// even without AI. "A lightweight woven fabric with natural airflow"
// → "lightweight woven fabric airflow"
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'that', 'this', 'these', 'those', 'it', 'its',
  'which', 'who', 'what', 'when', 'where', 'how', 'all', 'some', 'any', 'no',
  'not', 'my', 'your', 'his', 'her', 'our', 'their', 'i', 'you', 'he', 'she',
  'we', 'they', 'me', 'him', 'us', 'them',
])

function extractKeywords(q: string): string {
  const cleaned = cleanQuery(q)
  const words = cleaned.toLowerCase().split(/\s+/)
  const keywords = words.filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  // Max 3 words — more than that makes Serper queries too narrow to find anything
  return keywords.slice(0, 3).join(' ')
}

// Multiple 2D suffix variants — texture-focused, not game sprite focused
const TWO_D_SUFFIX_A = 'free seamless 2D texture pattern'
const TWO_D_SUFFIX_B = 'free hand-drawn texture surface tileable'

function buildSerperQuery(terms: string, mode: AssetMode, sites: string[], suffix2dVariant: 'a' | 'b' = 'a'): string {
  let suffix: string
  if (mode === '2d') {
    suffix = suffix2dVariant === 'a' ? TWO_D_SUFFIX_A : TWO_D_SUFFIX_B
  } else if (mode === '3d') {
    suffix = 'free texture OR material PBR'
  } else {
    suffix = 'free texture OR material OR sprite'
  }
  const siteFilter = sites.map((s) => `site:${s}`).join(' OR ')
  return `${terms} ${suffix} (${siteFilter})`
}

function buildSearchQuery(q: string): { sites: string[]; mode: AssetMode; keywords: string } {
  const mode = detectMode(q)
  // For 'both' mode we run separate 3D + 2D queries, so sites here is just used for
  // domain filtering after results come in — always pass ALL_SITES for that.
  const sites = ALL_SITES
  const keywords = extractKeywords(q)
  return { sites, mode, keywords }
}

// ── AI Query Expansion ──────────────────────────────────────────────────────
// Tries models in order, skipping any that return 429 (rate-limited upstream)
// 'openrouter/auto' lets OpenRouter pick any available model — bypasses
// per-provider rate limits that hit named free models.
const FREE_MODELS = [
  'openrouter/auto',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
]

async function expandQuery(
  query: string,
  mode: AssetMode,
): Promise<{ terms: string[]; error?: string; modelUsed?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { terms: [], error: 'OPENROUTER_API_KEY not set' }

  const modeHint =
    mode === '2d'
      ? 'illustrated, hand-drawn, or flat 2D textures and surface patterns'
      : mode === '3d'
      ? 'PBR textures, seamless materials, and normal maps'
      : 'seamless textures, PBR materials, or illustrated surface patterns'

  const prompt = `You are a search query optimizer for finding free ${modeHint} on sites like Poly Haven, AmbientCG, OpenGameArt, and Kenney.

User query: "${query}"

Generate exactly 2 short, distinct search queries (2-5 words each) that use specific technical terms asset creators actually use — not the user's vague description. Return ONLY a JSON array of 2 strings, nothing else.

Example output: ["woven fabric PBR seamless", "linen cloth material tileable"]`

  let lastError = ''

  for (const model of FREE_MODELS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 7000)

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://textura.app',
          'X-Title': 'Textura',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 80,
          temperature: 0.3,
        }),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res.status === 429) {
        lastError = `${model} rate-limited, trying next`
        continue
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        lastError = `${model} error ${res.status}: ${errText}`
        continue
      }

      const data = await res.json()
      const content: string = data.choices?.[0]?.message?.content?.trim() ?? ''
      if (!content) { lastError = `${model} returned empty content`; continue }

      const match = content.match(/\[[\s\S]*?\]/)
      if (!match) { lastError = `${model} unparseable: ${content}`; continue }

      const parsed: unknown = JSON.parse(match[0])
      if (!Array.isArray(parsed)) { lastError = 'Not an array'; continue }

      const terms = (parsed as unknown[])
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 2)

      if (terms.length === 0) { lastError = `${model} returned empty array`; continue }

      return { terms, modelUsed: model }
    } catch (e) {
      lastError = `${model} threw: ${String(e)}`
      continue
    }
  }

  return { terms: [], error: `All models failed. Last: ${lastError}` }
}

// ── Suggested Sites ──────────────────────────────────────────────────────────
function buildSuggestedSites(keywords: string, mode: AssetMode): SuggestedSite[] {
  const q = encodeURIComponent(keywords)
  const sites: SuggestedSite[] = []

  if (mode !== '2d') {
    sites.push(
      { name: 'Poly Haven', url: `https://polyhaven.com/textures?s=${q}`, description: 'Free CC0 PBR textures & HDRIs' },
      { name: 'AmbientCG', url: `https://ambientcg.com/list?search=${q}`, description: 'CC0 PBR materials' },
      { name: '3DTextures.me', url: `https://3dtextures.me/?s=${q}`, description: 'Free seamless PBR textures' },
      { name: 'FreePBR', url: `https://freepbr.com/?s=${q}`, description: 'Free PBR texture maps' },
      { name: 'CGBookcase', url: `https://www.cgbookcase.com/textures?search=${q}`, description: 'Free tileable PBR textures' },
      { name: 'ShareTextures', url: `https://www.sharetextures.com/textures?search=${q}`, description: 'Free CC0 textures' },
    )
  }

  if (mode !== '3d') {
    sites.push(
      { name: 'OpenGameArt', url: `https://opengameart.org/art-search-advanced?keys=${q}&field_art_type%5B%5D=3`, description: 'Free 2D textures & patterns (OGA textures)' },
      { name: 'Kenney', url: `https://kenney.nl/assets?q=${q}`, description: 'Free CC0 texture & asset packs' },
      { name: 'itch.io Assets', url: `https://itch.io/game-assets/free/tag-textures?search=${q}`, description: 'Free texture packs on itch.io' },
      { name: 'CraftPix', url: `https://craftpix.net/search/?q=${q}`, description: 'Free & paid texture packs' },
    )
  }

  if (mode === 'both') {
    sites.push(
      { name: 'PublicDomainTextures', url: `https://www.publicdomaintextures.net/?s=${q}`, description: 'Public domain photo textures' },
    )
  }

  return sites
}

// ── Serper Fetching ──────────────────────────────────────────────────────────
async function fetchSerperResults(
  serperQuery: string,
  apiKey: string,
): Promise<Array<{ link: string; title: string; snippet: string; imageUrl?: string }>> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: serperQuery, num: 20 }),
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.organic ?? []
  } catch {
    return []
  }
}

// ── URL / Domain Helpers ─────────────────────────────────────────────────────
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

    if (u.hostname.includes('polyhaven.com')) {
      const m = path.match(/^\/a\/([a-z0-9_]+)$/)
      if (m) return {
        downloadUrl: `/api/download/asset?source=polyhaven&id=${m[1]}`,
        thumbUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${m[1]}.png?height=400`,
        isSpecificPage: true,
      }
      return none
    }

    if (u.hostname.includes('ambientcg.com')) {
      const id = u.searchParams.get('id')
      if (path === '/view' && id) return {
        downloadUrl: `/api/download/asset?source=ambientcg&id=${id}`,
        thumbUrl: `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-PNG/${id}.png`,
        isSpecificPage: true,
      }
      return none
    }

    if (u.hostname.includes('3dtextures.me')) {
      const GENERIC = ['category', 'tag', 'page', 'author', 'search']
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 1 && !segments.some((s) => GENERIC.includes(s)) }
    }

    if (u.hostname.includes('freepbr.com')) {
      const GENERIC = ['category', 'page', 'tag', 'search']
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 1 && !segments.some((s) => GENERIC.includes(s)) }
    }

    if (u.hostname.includes('cgbookcase.com')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 && segments[0] === 'textures' }
    }

    if (u.hostname.includes('sharetextures.com')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 3 && segments[0] === 'textures' }
    }

    if (u.hostname.includes('publicdomaintextures.net')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 }
    }

    if (u.hostname.includes('texturecan.com')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.includes('details') && segments.length >= 2 }
    }

    if (u.hostname.includes('opengameart.org')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 && segments[0] === 'content' }
    }

    if (u.hostname.includes('kenney.nl')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments[0] === 'assets' && segments.length >= 2 }
    }

    if (u.hostname.includes('game-icons.net')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 3 }
    }

    if (u.hostname.includes('craftpix.net')) {
      return { downloadUrl: null, thumbUrl: null, isSpecificPage: segments.length >= 2 && (segments[0] === 'product' || segments[0] === 'freebies') }
    }

    if (u.hostname.includes('itch.io')) {
      if (u.hostname === 'itch.io') return none
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
      /\s*[-–|]\s*(Poly Haven|AmbientCG|3DTextures|FreePBR|CGBookcase|ShareTextures|Free PBR|Texture Can|OpenGameArt|Kenney|CraftPix|itch\.io).*/i,
      ''
    )
    .replace(/\s*\|\s*.*$/, '')
    .trim()
}

function deduplicateOrganic(
  batches: Array<Array<{ link: string; title: string; snippet: string; imageUrl?: string }>>,
): Array<{ link: string; title: string; snippet: string; imageUrl?: string }> {
  const seen = new Set<string>()
  const out: Array<{ link: string; title: string; snippet: string; imageUrl?: string }> = []
  for (const batch of batches) {
    for (const item of batch) {
      if (!seen.has(item.link)) {
        seen.add(item.link)
        out.push(item)
      }
    }
  }
  return out
}

// ── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (!query.trim()) return NextResponse.json({ results: [], suggestedSites: [] })

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) {
    return NextResponse.json({ error: 'SERPER_API_KEY not configured' }, { status: 503 })
  }

  const { sites, mode, keywords } = buildSearchQuery(query)

  // Build base Serper queries. For 'both' mode, split 3D and 2D sites into two
  // separate queries — a single query with 13+ site: operators is too complex for
  // Google. Also run a second dedicated 2D query with an alternate suffix so 2D
  // coverage isn't crowded out by 3D results.
  const baseQueries =
    mode === 'both'
      ? [
          buildSerperQuery(keywords, mode, THREE_D_SITES),
          buildSerperQuery(keywords, '2d', TWO_D_SITES, 'a'),
          buildSerperQuery(keywords, '2d', TWO_D_SITES, 'b'),
        ]
      : mode === '2d'
      ? [
          buildSerperQuery(keywords, '2d', TWO_D_SITES, 'a'),
          buildSerperQuery(keywords, '2d', TWO_D_SITES, 'b'),
        ]
      : [buildSerperQuery(keywords, mode, THREE_D_SITES)]

  // Run base Serper queries and AI expansion in parallel
  const [baseOrganicBatches, { terms: expandedTerms, error: openRouterError, modelUsed }] =
    await Promise.all([
      Promise.all(baseQueries.map((q) => fetchSerperResults(q, serperKey))),
      expandQuery(query, mode),
    ])

  // Run expanded queries (one Serper call per AI term, also split by mode)
  const expandedOrganicBatches = await Promise.all(
    expandedTerms.flatMap((terms) =>
      mode === 'both'
        ? [
            fetchSerperResults(buildSerperQuery(terms, mode, THREE_D_SITES), serperKey),
            fetchSerperResults(buildSerperQuery(terms, '2d', TWO_D_SITES, 'a'), serperKey),
            fetchSerperResults(buildSerperQuery(terms, '2d', TWO_D_SITES, 'b'), serperKey),
          ]
        : mode === '2d'
        ? [
            fetchSerperResults(buildSerperQuery(terms, '2d', TWO_D_SITES, 'a'), serperKey),
            fetchSerperResults(buildSerperQuery(terms, '2d', TWO_D_SITES, 'b'), serperKey),
          ]
        : [fetchSerperResults(buildSerperQuery(terms, mode, THREE_D_SITES), serperKey)]
    )
  )

  // Merge: base results first, then AI-expanded (preserves ranking priority)
  const allOrganic = deduplicateOrganic([...baseOrganicBatches, ...expandedOrganicBatches])

  const filtered = allOrganic
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

  // Use first AI-expanded term for suggested site URLs (more technical),
  // falling back to extracted keywords
  const siteSearchTerm = expandedTerms[0] ?? keywords
  const suggestedSites = buildSuggestedSites(siteSearchTerm, mode)

  return NextResponse.json({
    results,
    suggestedSites,
    _debug: {
      keywords,
      baseQueries,
      expandedTerms,
      openRouterError: openRouterError ?? null,
      modelUsed: modelUsed ?? null,
      totalRaw: allOrganic.length,
      afterFilter: filtered.length,
    },
  })
}
