import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client only if environment variables are configured
export const redis =
  redisUrl && redisToken && !redisUrl.includes("your-redis-url")
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

if (!redis) {
  console.warn("⚠️ Upstash Redis credentials not configured. Caching is disabled.");
}
