// HuggingFace Inference API — free, no billing needed
// SDXL is on the free hosted inference tier
const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'

const TEXTURE_SUFFIX =
  'seamless tileable texture, top-down flat surface, no shadows, no perspective, ultra high detail, 4K, product photography lighting, seamless pattern, PBR texture'

export function enhancePrompt(userPrompt: string): string {
  return `${userPrompt}, ${TEXTURE_SUFFIX}`
}

export async function generateTexture(enhancedPrompt: string): Promise<ArrayBuffer> {
  const apiKey = process.env.HF_API_KEY
  if (!apiKey) throw new Error('HF_API_KEY not configured')

  const res = await fetch(`https://router.huggingface.co/hf-inference/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'x-wait-for-model': 'true',
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: { width: 1024, height: 1024 },
    }),
  })

  if (!res.ok) {
    throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`)
  }

  return res.arrayBuffer()
}
