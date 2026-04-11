type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string) {
      const entry = store.get(key);

      if (!entry) {
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }

      return entry.value;
    },
    set(key: string, value: T) {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
    }
  };
}

