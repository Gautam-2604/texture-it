import { NextRequest, NextResponse } from 'next/server'

// Actual Poly Haven files API structure:
// { mapType: { resolution: { format: { url, size, md5 } } } }
// e.g. { "Diffuse": { "2k": { "jpg": { url: "...", size: 123 } } } }
type PolyHavenFiles = Record<
  string,
  Record<string, Record<string, { url: string; size: number }>>
>

async function getPolyHavenDownloadUrl(slug: string): Promise<string | null> {
  const res = await fetch(`https://api.polyhaven.com/files/${slug}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null

  const files: PolyHavenFiles = await res.json()

  // Prefer the Diffuse/Color map (main texture), 2K resolution, jpg format
  const preferredMaps = ['Diffuse', 'Color', 'Albedo', 'diff']
  const preferredResolutions = ['2k', '1k', '4k', '8k']
  const preferredFormats = ['jpg', 'png']

  const allMaps = Object.keys(files)
  const mapsToTry = [
    ...preferredMaps.filter((m) => allMaps.includes(m)),
    ...allMaps.filter((m) => !preferredMaps.includes(m)),
  ]

  for (const mapName of mapsToTry) {
    const resolutions = files[mapName]
    if (!resolutions || typeof resolutions !== 'object') continue

    for (const resolution of preferredResolutions) {
      const formats = resolutions[resolution]
      if (!formats) continue

      for (const format of preferredFormats) {
        if (formats[format]?.url) return formats[format].url
      }
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get('source')
  const id = req.nextUrl.searchParams.get('id')

  if (!source || !id) {
    return NextResponse.json({ error: 'Missing source or id' }, { status: 400 })
  }

  // ── Poly Haven ────────────────────────────────────────────────────────────────
  if (source === 'polyhaven') {
    const fileUrl = await getPolyHavenDownloadUrl(id)
    if (!fileUrl) {
      return NextResponse.json({ error: 'Could not resolve download URL' }, { status: 404 })
    }

    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'File fetch failed' }, { status: 502 })
    }

    const contentType = fileRes.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'

    return new Response(fileRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${id}_2k.${ext}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // ── AmbientCG ─────────────────────────────────────────────────────────────────
  // Use their API to get the real download link, then stream through our proxy
  if (source === 'ambientcg') {
    const apiRes = await fetch(
      `https://ambientcg.com/api/v2/full_json?id=${encodeURIComponent(id)}&include=downloadData`,
      { next: { revalidate: 3600 } }
    )
    if (!apiRes.ok) {
      return NextResponse.json({ error: 'AmbientCG API unavailable' }, { status: 502 })
    }

    const apiData = await apiRes.json()
    const asset = apiData.foundAssets?.[0]
    const downloads: Array<{ attribute: string; downloadLink: string }> =
      asset?.downloadFolders?.default?.downloadFiletypeCategories?.zip?.downloads ?? []

    // Prefer 2K-JPG, fall back to first available
    const preferred =
      downloads.find((d) => d.attribute === '2K-JPG') ??
      downloads.find((d) => d.attribute === '1K-JPG') ??
      downloads[0]

    if (!preferred?.downloadLink) {
      return NextResponse.json({ error: 'No download available for this asset' }, { status: 404 })
    }

    const fileRes = await fetch(preferred.downloadLink)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'File fetch failed' }, { status: 502 })
    }

    return new Response(fileRes.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${id}_2K.zip"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
}
