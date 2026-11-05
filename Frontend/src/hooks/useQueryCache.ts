type Listener = (invalidatedKey: string) => void;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryClient {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Set<Listener>();

  private serializeKey(key: string | (string | number | boolean | undefined | null)[]): string {
    if (Array.isArray(key)) {
      return key.filter((k) => k !== undefined && k !== null).join('::');
    }
    return String(key);
  }

  public get<T>(key: string | any[], maxAgeMs: number = 30000): T | null {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > maxAgeMs;
    if (isExpired) {
      this.cache.delete(serialized);
      return null;
    }

    return entry.data as T;
  }

  public set<T>(key: string | any[], data: T): void {
    const serialized = this.serializeKey(key);
    this.cache.set(serialized, {
      data,
      timestamp: Date.now(),
    });
  }

  public invalidateQueries(keyPrefix: string | any[]): void {
    const prefix = this.serializeKey(keyPrefix);
    for (const k of this.cache.keys()) {
      if (k === prefix || k.startsWith(prefix)) {
        this.cache.delete(k);
      }
    }
    this.listeners.forEach((listener) => listener(prefix));
  }

  public clear(): void {
    this.cache.clear();
    this.listeners.forEach((listener) => listener('*'));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const queryClient = new QueryClient();
