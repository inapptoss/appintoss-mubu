import NodeCache from "node-cache";
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5분

export async function memo<T>(key: string, ttlSec: number, fn: () => Promise<T>) {
  const v = cache.get<T>(key);
  if (v !== undefined) return v;
  const fresh = await fn();
  cache.set(key, fresh, ttlSec);
  return fresh;
}
