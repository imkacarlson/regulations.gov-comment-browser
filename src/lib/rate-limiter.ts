export class FreeTierRateLimiter {
  private requestTimestamps: number[] = [];
  private tokenTimestamps: { ts: number; tokens: number }[] = [];
  private dayTimestamps: number[] = [];

  constructor(
    private maxRPM = 30000,
    private maxTPM = 30000000,
    private maxRPD = 500
  ) {}

  private totalTokens(now: number) {
    return this.tokenTimestamps.reduce((sum, t) => sum + t.tokens, 0);
  }

  async limitRequest(tokens: number) {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    this.tokenTimestamps = this.tokenTimestamps.filter(t => now - t.ts < 60000);
    this.dayTimestamps = this.dayTimestamps.filter(t => now - t < 86400000);

    while (
      this.requestTimestamps.length >= this.maxRPM ||
      this.totalTokens(now) + tokens > this.maxTPM ||
      this.dayTimestamps.length >= this.maxRPD
    ) {
      const oldestMinute = this.requestTimestamps[0] || now;
      const oldestDay = this.dayTimestamps[0] || now;
      const waitMsMinute = 60000 - (now - oldestMinute) + 50;
      const waitMsDay = 86400000 - (now - oldestDay) + 50;
      const waitMs = Math.max(waitMsMinute, waitMsDay);
      const delay = Math.min(waitMs, 60000);
      await new Promise(r => setTimeout(r, delay));
      const newNow = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(t => newNow - t < 60000);
      this.tokenTimestamps = this.tokenTimestamps.filter(t => newNow - t.ts < 60000);
      this.dayTimestamps = this.dayTimestamps.filter(t => newNow - t < 86400000);
    }

    this.requestTimestamps.push(now);
    this.tokenTimestamps.push({ ts: now, tokens });
    this.dayTimestamps.push(now);
  }

  recordTokens(tokens: number) {
    const now = Date.now();
    this.tokenTimestamps = this.tokenTimestamps.filter(t => now - t.ts < 60000);
    this.tokenTimestamps.push({ ts: now, tokens });
  }
}

export const freeTierRateLimiter = new FreeTierRateLimiter();

export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ~= 4 characters
  return Math.ceil(text.length / 4);
}
