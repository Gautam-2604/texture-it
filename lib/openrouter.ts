// HuggingFace Inference API — free, no billing needed
const HF_PRIMARY_MODEL = 'black-forest-labs/FLUX.1-schnell'
const HF_FALLBACK_MODEL = 'stabilityai/stable-diffusion-2-1'

const TEXTURE_SUFFIX =
  'seamless tileable texture, top-down flat surface, no shadows, no perspective, ultra high detail, 4K, product photography lighting, seamless pattern, PBR texture'

export function enhancePrompt(userPrompt: string): string {
  return `${userPrompt}, ${TEXTURE_SUFFIX}`
}

async function callHfModel(model: string, prompt: string, apiKey: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'x-wait-for-model': 'true',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width: 1024, height: 1024 },
    }),
  })

  if (!res.ok) {
    throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`)
  }

  return res.arrayBuffer()
}

export async function generateTexture(enhancedPrompt: string): Promise<ArrayBuffer> {
  const apiKey = process.env.HF_API_KEY
  if (!apiKey) throw new Error('HF_API_KEY not configured')

  try {
    return await callHfModel(HF_PRIMARY_MODEL, enhancedPrompt, apiKey)
  } catch (primaryErr) {
    console.warn(`[generateTexture] Primary model failed, trying fallback. Error: ${primaryErr instanceof Error ? primaryErr.message : primaryErr}`)
    return await callHfModel(HF_FALLBACK_MODEL, enhancedPrompt, apiKey)
  }
}
