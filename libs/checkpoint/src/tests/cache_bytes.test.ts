import { describe, expect, it } from "vitest";
import type { CacheFullKey } from "../cache/base.js";
import { InMemoryCache } from "../cache/memory.js";

// The package is platform-neutral and does not include Node ambient types.
// Vitest runs these tests in Node, where Buffer is a Uint8Array subclass.
declare const Buffer: { from(values: number[]): Uint8Array };

describe("InMemoryCache byte snapshots", () => {
  const key: CacheFullKey = [["binary"], "result"];

  it.each([Uint8Array.from([1, 2, 3]), Buffer.from([1, 2, 3])])(
    "retains the stored bytes when the caller mutates its input: %s",
    async (value) => {
      const cache = new InMemoryCache<Uint8Array>();
      await cache.set([{ key, value }]);
      value.fill(9);
      const [hit] = await cache.get([key]);
      expect(Array.from(hit.value)).toEqual([1, 2, 3]);
    }
  );

  it.each([Uint8Array.from([1, 2, 3]), Buffer.from([1, 2, 3])])(
    "isolates repeated and concurrent reads of cached bytes: %s",
    async (value) => {
      const cache = new InMemoryCache<Uint8Array>();
      await cache.set([{ key, value }]);
      const [first, second] = await cache.get([key, key]);
      first.value.fill(8);
      expect(Array.from(second.value)).toEqual([1, 2, 3]);
      const [later] = await cache.get([key]);
      expect(Array.from(later.value)).toEqual([1, 2, 3]);
    }
  );
});
