/**
 * Simple per-key cooldown. `tryAcquire(key)` returns true and records the time
 * the first time a key is seen (and again once the window has fully elapsed);
 * it returns false while the key is still cooling down. Used to throttle
 * repeated notifications (e.g. proactive Discord alert posts).
 */
export class Cooldown {
  private readonly lastAt = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  tryAcquire(key: string, now: number = Date.now()): boolean {
    const last = this.lastAt.get(key);
    if (last !== undefined && now - last < this.windowMs) {
      return false;
    }
    this.lastAt.set(key, now);
    return true;
  }

  /** Forget a key so the next acquire is allowed immediately. */
  clear(key: string): void {
    this.lastAt.delete(key);
  }

  has(key: string): boolean {
    return this.lastAt.has(key);
  }
}
