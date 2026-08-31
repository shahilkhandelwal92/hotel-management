/**
 * Distributed Rate Limiting Abstraction (Redis / Upstash + Memory Fallback)
 * ──────────────────────────────────────────────────────────────────────
 * Sliding-window rate limiter with distributed Redis store in production.
 * Protects login, public APIs, payment endpoints, and exports.
 */

export interface RateLimitOptions {
    maxRequests: number; // Max allowed requests
    windowMs: number;    // Time window in milliseconds
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetMs: number;
    total: number;
}

export interface RateLimiterStore {
    check(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

/**
 * In-memory sliding window rate limiter (Development & Testing fallback)
 */
export class MemoryRateLimiter implements RateLimiterStore {
    private hits = new Map<string, { count: number; resetTime: number }>();

    async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        const now = Date.now();
        const record = this.hits.get(key);

        if (!record || now > record.resetTime) {
            const resetTime = now + options.windowMs;
            this.hits.set(key, { count: 1, resetTime });
            return {
                allowed: true,
                remaining: options.maxRequests - 1,
                resetMs: options.windowMs,
                total: options.maxRequests,
            };
        }

        record.count += 1;
        const resetMs = Math.max(0, record.resetTime - now);

        if (record.count > options.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetMs,
                total: options.maxRequests,
            };
        }

        return {
            allowed: true,
            remaining: options.maxRequests - record.count,
            resetMs,
            total: options.maxRequests,
        };
    }
}

/**
 * Distributed Redis Rate Limiter (Upstash / Redis REST API for production serverless)
 */
export class DistributedRedisRateLimiter implements RateLimiterStore {
    private fallback = new MemoryRateLimiter();
    private restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL;
    private restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN;

    async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        if (!this.restUrl || !this.restToken) {
            return this.fallback.check(key, options);
        }

        try {
            const windowSeconds = Math.ceil(options.windowMs / 1000);
            const redisKey = `ratelimit:${key}`;

            // Atomic increment and TTL via Upstash REST pipeline
            const response = await fetch(`${this.restUrl}/pipeline`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.restToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([
                    ["INCR", redisKey],
                    ["EXPIRE", redisKey, windowSeconds, "NX"],
                    ["PTTL", redisKey],
                ]),
                cache: "no-store",
            });

            if (!response.ok) {
                return this.fallback.check(key, options);
            }

            const data = await response.json();
            const currentCount = Number(data[0]?.result ?? 1);
            const pttl = Math.max(0, Number(data[2]?.result ?? options.windowMs));

            const allowed = currentCount <= options.maxRequests;
            return {
                allowed,
                remaining: Math.max(0, options.maxRequests - currentCount),
                resetMs: pttl > 0 ? pttl : options.windowMs,
                total: options.maxRequests,
            };
        } catch {
            return this.fallback.check(key, options);
        }
    }
}

// Global singleton instance
export const rateLimiter: RateLimiterStore = new DistributedRedisRateLimiter();

/**
 * Standard rate limit configurations for critical endpoint tiers
 */
export const RATE_LIMIT_TIERS = {
    AUTH_LOGIN: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 requests per minute
    PUBLIC_PORTAL: { maxRequests: 30, windowMs: 60 * 1000 },  // 30 requests per minute
    REPORTS_EXPORT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 exports per minute
    GENERAL_API: { maxRequests: 120, windowMs: 60 * 1000 },   // 120 requests per minute
} as const;
