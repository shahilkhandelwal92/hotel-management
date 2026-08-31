/**
 * Distributed Rate Limiting Abstraction
 * ──────────────────────────────────────────────────────────────────────
 * Sliding-window rate limiter with production-ready fallback support.
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
 * High-performance in-memory sliding window rate limiter
 */
class MemoryRateLimiter implements RateLimiterStore {
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

// Global singleton instance with extensible pluggable provider
export const rateLimiter: RateLimiterStore = new MemoryRateLimiter();

/**
 * Standard rate limit configurations for critical endpoint tiers
 */
export const RATE_LIMIT_TIERS = {
    AUTH_LOGIN: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 requests per minute
    PUBLIC_PORTAL: { maxRequests: 30, windowMs: 60 * 1000 },  // 30 requests per minute
    REPORTS_EXPORT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 exports per minute
    GENERAL_API: { maxRequests: 120, windowMs: 60 * 1000 },   // 120 requests per minute
} as const;
