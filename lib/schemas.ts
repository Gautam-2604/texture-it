import { z } from 'zod'

// Prompt injection patterns to reject
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all)\s+instructions/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /pretend\s+you\s+(are|have|can)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(a|an)\s+/i,
  /forget\s+(all\s+)?(your\s+)?(previous\s+)?(training|instructions)/i,
]

// HTML/script injection
const HTML_PATTERN = /<[a-z][\s\S]*>/i

export const generateSchema = z.object({
  prompt: z
    .string()
    .min(3, 'Prompt must be at least 3 characters')
    .max(500, 'Prompt must be under 500 characters')
    .transform((val) => val.trim())
    .refine((val) => !HTML_PATTERN.test(val), {
      message: 'Prompt contains invalid characters',
    })
    .refine(
      (val) => !INJECTION_PATTERNS.some((pattern) => pattern.test(val)),
      { message: 'Prompt contains disallowed content' }
    ),
})

export type GenerateInput = z.infer<typeof generateSchema>

export const downloadSchema = z.object({
  id: z.string().uuid('Invalid texture ID'),
})
