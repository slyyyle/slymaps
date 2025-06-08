// Simple cache service for POI data
// 24 hours in dev, configurable for production

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  // 24 hours for dev, 12 hours for production
  private defaultTTL = process.env.NODE_ENV === 'development' 
    ? 24 * 60 * 60 * 1000  // 24 hours in dev
    : 12 * 60 * 60 * 1000; // 12 hours in production

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats(): { size: number; entries: Array<{ key: string; age: string }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: `${Math.round((Date.now() - entry.timestamp) / 60000)}m ago`
    }));
    
    return { size: this.cache.size, entries };
  }
}

export const cacheService = new CacheService(); 