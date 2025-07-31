/**
 * Simple rate limiter to prevent API abuse
 */

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed for given IP
   */
  isAllowed(ip: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(ip, validRequests);

    return true;
  }

  /**
   * Get remaining requests for IP
   */
  getRemainingRequests(ip: string): number {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Clean up old entries periodically
   */
  cleanup(): void {
    const now = Date.now();

    for (const [ip, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs);

      if (validRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validRequests);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(
  () => {
    rateLimiter.cleanup();
  },
  5 * 60 * 1000
);
