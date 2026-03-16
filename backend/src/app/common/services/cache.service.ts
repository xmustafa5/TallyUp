import type { Redis } from 'ioredis';

export class CacheService {
  constructor(private readonly redis: Redis | undefined) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, data: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async invalidate(...patterns: string[]): Promise<void> {
    if (!this.redis) return;
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  async invalidateExact(...keys: string[]): Promise<void> {
    if (!this.redis) return;
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
