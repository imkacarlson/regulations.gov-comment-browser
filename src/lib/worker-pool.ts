const requestTimestamps: number[] = [];

async function rateLimitDelay(requests: number, perSeconds: number) {
  const now = Date.now();
  
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - perSeconds * 1000) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= requests) {
    const oldestTimestamp = requestTimestamps[0];
    const delay = (oldestTimestamp + perSeconds * 1000) - now;
    if (delay > 0) {
      console.log(`  [Rate Limiter] Delaying for ${Math.round(delay / 1000)}s to respect rate limit...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  requestTimestamps.push(Date.now());
}

export async function runPool<T>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number, total: number) => Promise<void>,
  rateLimit?: { requests: number; perSeconds: number }
) {
  const queue = [...items];
  let processed = 0;

  async function worker() {
    while (true) {
      const item = queue.shift();
      if (!item) break;
      
      if (rateLimit) {
        await rateLimitDelay(rateLimit.requests, rateLimit.perSeconds);
      }
      
      const index = ++processed;
      await handler(item, index, items.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker())
  );
} 