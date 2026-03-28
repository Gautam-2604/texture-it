import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
let generateRatelimit: Ratelimit | null = null
let downloadRatelimit: Ratelimit | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

export function getGenerateRatelimit(): Ratelimit {
  if (!generateRatelimit) {
    generateRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'textura:generate',
    })
  }
  return generateRatelimit
}

export function getDownloadRatelimit(): Ratelimit {
  if (!downloadRatelimit) {
    downloadRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'textura:download',
    })
  }
  return downloadRatelimit
}
