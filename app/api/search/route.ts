import { NextRequest, NextResponse } from 'next/server'

export interface TextureAsset {
  id: string
  name: string
  categories: string[]
  thumb: string
  downloadUrl: string | null
  pageUrl: string
  source: 'polyhaven' | 'ambientcg' | '3dtextures' | 'freepbr' | 'subtlepatterns' | 'transparenttextures' | 'lostandtaken'
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

// ── 3DTextures.me ─────────────────────────────────────────────────────────────
// WordPress REST API. IMPORTANT: do NOT use _fields — it strips _embedded and
// breaks thumbnail extraction. Use _embed=1 to embed featured media.
interface WPMediaSize {
  source_url?: string
}
interface WPPost {
  id: number
  link: string
  title: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string
      media_details?: {
        sizes?: {
          'post-thumbnail'?: WPMediaSize
          medium?: WPMediaSize
          thumbnail?: WPMediaSize
        }
      }
    }>
  }
}

function wpThumb(post: WPPost): string {
  const m = post._embedded?.['wp:featuredmedia']?.[0]
  return (
    m?.media_details?.sizes?.['post-thumbnail']?.source_url ??
    m?.media_details?.sizes?.medium?.source_url ??
    m?.media_details?.sizes?.thumbnail?.source_url ??
    m?.source_url ??
    ''
  )
}

function wpName(post: WPPost): string {
  return post.title.rendered
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

async function fetchWPPosts(baseUrl: string, q: string): Promise<WPPost[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    // No _fields — it kills _embedded. Use _embed=1 to get featured images.
    const params = new URLSearchParams({
      per_page: '12',
      _embed: '1',
      ...(q ? { search: q } : { orderby: 'date', order: 'desc' }),
    })
    const res = await fetch(`${baseUrl}?${params}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    clearTimeout(timeout)
    return []
  }
}

async function search3DTextures(q: string): Promise<TextureAsset[]> {
  const posts = await fetchWPPosts('https://3dtextures.me/wp-json/wp/v2/posts', q)
  return posts.map((p) => ({
    id: `3dt_${p.id}`,
    name: wpName(p),
    categories: [],
    thumb: wpThumb(p),
    downloadUrl: null,
    pageUrl: p.link,
    source: '3dtextures' as const,
    sourceLabel: '3DTextures.me',
    assetDimension: '3d' as const,
  }))
}

// ── FreePBR ────────────────────────────────────────────────────────────────────
async function searchFreePBR(q: string): Promise<TextureAsset[]> {
  const posts = await fetchWPPosts('https://freepbr.com/wp-json/wp/v2/posts', q)
  return posts.map((p) => ({
    id: `fpbr_${p.id}`,
    name: wpName(p),
    categories: [],
    thumb: wpThumb(p),
    downloadUrl: null,
    pageUrl: p.link,
    source: 'freepbr' as const,
    sourceLabel: 'FreePBR',
    assetDimension: '3d' as const,
  }))
}

// ── Subtle Patterns ───────────────────────────────────────────────────────────
// Open-source repo of ~400 seamless tileable PNG surface textures (fabric, paper,
// concrete, wood grain, etc.). All CC0. Patterns live at the repo root — each PNG
// file IS the seamless texture and serves as its own thumbnail.
// Repo: github.com/subtlepatterns/SubtlePatterns
interface GHContentItem {
  name: string
  type: 'file' | 'dir'
  download_url: string | null
  html_url: string
}

async function searchSubtlePatterns(q: string): Promise<TextureAsset[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(
      'https://api.github.com/repos/subtlepatterns/SubtlePatterns/contents/',
      {
        signal: controller.signal,
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 86400 },
      }
    )
    clearTimeout(timeout)
    if (!res.ok) return []

    const items: GHContentItem[] = await res.json()
    if (!Array.isArray(items)) return []

    const qLower = q.toLowerCase()

    return items
      .filter(
        (f) =>
          f.type === 'file' &&
          f.name.endsWith('.png') &&
          !f.name.includes('@2X') &&
          (!q || f.name.toLowerCase().replace(/-/g, ' ').includes(qLower))
      )
      .slice(0, 16)
      .map((f) => {
        const slug = f.name.replace('.png', '')
        const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        const rawUrl = f.download_url ?? ''
        return {
          id: `sp_${slug}`,
          name,
          categories: ['seamless', 'tileable', 'pattern'],
          thumb: rawUrl,
          downloadUrl: rawUrl,
          pageUrl: f.html_url,
          source: 'subtlepatterns' as const,
          sourceLabel: 'Subtle Patterns',
          assetDimension: '2d' as const,
        }
      })
  } catch {
    clearTimeout(timeout)
    return []
  }
}

// ── Transparent Textures ───────────────────────────────────────────────────────
// 397 seamless overlay / background textures. Each has a direct PNG URL:
//   https://www.transparenttextures.com/patterns/[name].png
// The PNG itself is the preview — no separate thumbnail needed.
// Names are stable (site hasn't changed in years) so we hardcode them.
const TRANSPARENT_TEXTURES_NAMES: string[] = [
  '3px-tile','45-degree-fabric-dark','45-degree-fabric-light','60-lines','absurdity',
  'ag-square','always-grey','arabesque','arches','argyle','asfalt-dark','asfalt-light',
  'assault','axiom-pattern','az-subtle','back-pattern','basketball','batthern',
  'bedge-grunge','beige-paper','billie-holiday','binding-dark','binding-light',
  'black-felt','black-linen','black-linen-2','black-mamba','black-orchid','black-paper',
  'black-scales','black-thread','black-thread-light','black-twill','blizzard',
  'blu-stripes','bo-play','brick-wall','brick-wall-dark','bright-squares','brilliant',
  'broken-noise','brushed-alum','brushed-alum-dark','buried','candyhole','carbon-fibre',
  'carbon-fibre-big','carbon-fibre-v2','cardboard','cardboard-flat','cartographer',
  'checkered-light-emboss','checkered-pattern','church','circles','classy-fabric',
  'clean-gray-paper','clean-textile','climpek','cloth-alike','concrete-wall',
  'concrete-wall-2','concrete-wall-3','connected','corrugation','cream-dust',
  'cream-paper','cream-pixels','crisp-paper-ruffles','crissxcross','cross-scratches',
  'cross-stripes','crossword','cubes','cutcube','dark-brick-wall','dark-circles',
  'dark-denim','dark-denim-3','dark-dot','dark-dotted-2','dark-exa','dark-fish-skin',
  'dark-geometric','dark-leather','dark-matter','dark-mosaic','dark-stripes',
  'dark-stripes-light','dark-tire','dark-wall','dark-wood','darth-stripe','debut-dark',
  'debut-light','diagmonds','diagmonds-light','diagonal-noise','diagonal-striped-brick',
  'diagonal-waves','diagonales-decalees','diamond-eyes','diamond-upholstery',
  'diamonds-are-forever','dimension','dirty-old-black-shirt','dotnoise-light-grey',
  'double-lined','dust','ecailles','egg-shell','elastoplast','elegant-grid',
  'embossed-paper','escheresque','escheresque-dark','exclusive-paper','fabric-plaid',
  'fabric-1-dark','fabric-1-light','fabric-of-squares','fake-brick','fake-luxury',
  'fancy-deboss','farmer','felt','first-aid-kit','flower-trail','flowers','foggy-birds',
  'food','football-no-lines','french-stucco','fresh-snow','gold-scale','gplay',
  'gradient-squares','graphcoders-lil-fiber','graphy-dark','graphy','gravel',
  'gray-floral','gray-lines','gray-sand','green-cup','green-dust-and-scratches',
  'green-fibers','green-gobbler','grey-jean','grey-sandbag','grey-washed-wall',
  'greyzz','grid','grid-me','grid-noise','grilled-noise','groovepaper','grunge-wall',
  'gun-metal','handmade-paper','hexabump','hexellence','hixs-evolution','hoffman',
  'honey-im-subtle','ice-age','inflicted','inspiration-geometry','iron-grip',
  'kinda-jean','knitted-netting','knitted-sweater','kuji','large-leather','leather',
  'light-aluminum','light-gray','light-grey-floral-motif','light-honeycomb',
  'light-honeycomb-dark','light-mesh','light-paper-fibers','light-sketch','light-toast',
  'light-wool','lined-paper','lined-paper-2','little-knobs','little-pluses',
  'little-triangles','low-contrast-linen','lyonnette','maze-black','maze-white',
  'mbossed','medic-packaging-foil','merely-cubed','micro-carbon','mirrored-squares',
  'mocha-grunge','mooning','moulin','my-little-plaid-dark','my-little-plaid','nami',
  'nasty-fabric','natural-paper','navy','nice-snow','nistri','noise-lines',
  'noise-pattern-with-subtle-cross-lines','noisy','noisy-grid','noisy-net',
  'norwegian-rose','notebook','notebook-dark','office','old-husks','old-map',
  'old-mathematics','old-moon','old-wall','otis-redding','outlets','p1','p2','p4','p5',
  'p6','padded','padded-light','paper','paper-1','paper-2','paper-3','paper-fibers',
  'paven','perforated-white-leather','pineapple-cut','pinstripe-dark','pinstripe-light',
  'pinstriped-suit','pixel-weave','polaroid','polonez-pattern','polyester-lite',
  'pool-table','project-paper','ps-neutral','psychedelic','purty-wood','pw-pattern',
  'pyramid','quilt','random-grey-variations','ravenna','real-carbon-fibre','rebel',
  'redox-01','redox-02','reticular-tissue','retina-dust','retina-wood','retro-intro',
  'rice-paper','rice-paper-2','rice-paper-3','robots','rocky-wall','rough-cloth',
  'rough-cloth-light','rough-diagonal','rubber-grip','sandpaper','satin-weave',
  'scribble-light','shattered','shattered-dark','shine-caro','shine-dotted',
  'shley-tree-1','shley-tree-2','silver-scales','simple-dashed','simple-horizontal-light',
  'skeletal-weave','skewed-print','skin-side-up','skulls','slash-it',
  'small-crackle-bright','small-crosses','smooth-wall-dark','smooth-wall-light',
  'sneaker-mesh-fabric','snow','soft-circle-scales','soft-kill','soft-pad',
  'soft-wallpaper','solid','sos','sprinkles','squairy','squared-metal','squares',
  'stacked-circles','stardust','starring','stitched-wool','strange-bullseyes','straws',
  'stressed-linen','stucco','subtle-carbon','subtle-dark-vertical','subtle-dots',
  'subtle-freckles','subtle-grey','subtle-grunge','subtle-stripes','subtle-surface',
  'subtle-white-feathers','subtle-zebra-3d','subtlenet','swirl','tactile-noise-dark',
  'tactile-noise-light','tapestry','tasky','tex2res1','tex2res2','tex2res3','tex2res4',
  'tex2res5','textured-paper','textured-stripes','texturetastic-gray','ticks',
  'tileable-wood','tileable-wood-colored','tiny-grid','translucent-fibres',
  'transparent-square-tiles','tree-bark','triangles','triangles-2','triangular','tweed',
  'twinkle-twinkle','txture','type','use-your-illusion','vaio','vertical-cloth','vichy',
  'vintage-speckles','wall-4-light','washi','wave-grid','wavecut','weave','wet-snow',
  'white-bed-sheet','white-brick-wall','white-brushed','white-carbon','white-carbonfiber',
  'white-diamond','white-diamond-dark','white-leather','white-linen','white-paperboard',
  'white-plaster','white-sand','white-texture','white-tiles','white-wall','white-wall-2',
  'white-wall-3','white-wall-3-2','white-wave','whitey','wide-rectangles','wild-flowers',
  'wild-oliva','wine-cork','wood','wood-pattern','worn-dots','woven','woven-light',
  'xv','zig-zag','black-lozenge',
]

function searchTransparentTextures(q: string): TextureAsset[] {
  const qLower = q.toLowerCase()
  const matched = TRANSPARENT_TEXTURES_NAMES.filter(
    (name) => !q || name.replace(/-/g, ' ').includes(qLower)
  ).slice(0, 16)

  return matched.map((slug) => {
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const url = `https://www.transparenttextures.com/patterns/${slug}.png`
    return {
      id: `tt_${slug}`,
      name,
      categories: ['overlay', 'seamless', 'pattern'],
      thumb: url,
      downloadUrl: url,
      pageUrl: `https://www.transparenttextures.com/#${slug}`,
      source: 'transparenttextures' as const,
      sourceLabel: 'Transparent Textures',
      assetDimension: '2d' as const,
    }
  })
}

// ── Lost and Taken ─────────────────────────────────────────────────────────────
// Grunge, paper, fabric, and organic flat textures. WordPress-backed.
// Even when featured_media is 0, _embed=1 populates wp:featuredmedia with images.
async function searchLostAndTaken(q: string): Promise<TextureAsset[]> {
  const posts = await fetchWPPosts('https://lostandtaken.com/wp-json/wp/v2/posts', q)
  return posts.map((p) => ({
    id: `lt_${p.id}`,
    name: wpName(p),
    categories: ['grunge', 'organic', 'paper'],
    thumb: wpThumb(p),
    downloadUrl: null,
    pageUrl: p.link,
    source: 'lostandtaken' as const,
    sourceLabel: 'Lost and Taken',
    assetDimension: '2d' as const,
  }))
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const q = query.toLowerCase().trim()

  const ttResults = searchTransparentTextures(q) // sync — no fetch needed

  const [polyResults, acgResults, texResults, pbrResults, spResults, ltResults] =
    await Promise.allSettled([
      searchPolyHaven(q),
      searchAmbientCG(q),
      search3DTextures(q),
      searchFreePBR(q),
      searchSubtlePatterns(q),
      searchLostAndTaken(q),
    ])

  const results: TextureAsset[] = [
    ...(polyResults.status === 'fulfilled' ? polyResults.value : []),
    ...(acgResults.status === 'fulfilled' ? acgResults.value : []),
    ...(texResults.status === 'fulfilled' ? texResults.value : []),
    ...(pbrResults.status === 'fulfilled' ? pbrResults.value : []),
    ...ttResults,
    ...(spResults.status === 'fulfilled' ? spResults.value : []),
    ...(ltResults.status === 'fulfilled' ? ltResults.value : []),
  ]

  return NextResponse.json({ results })
}
