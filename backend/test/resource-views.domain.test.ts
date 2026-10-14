import { describe, expect, test } from "bun:test";

import {
  recordUniqueResourceView,
  type ResourceViewStore,
} from "../src/modules/resources/resource-views.domain.js";

function inMemoryViewStore(): ResourceViewStore {
  const views = new Set<string>();

  return {
    async insert(resourceId, userId) {
      // Yield once so concurrent callers overlap as they would at the database.
      await Promise.resolve();
      const key = `${resourceId}:${userId}`;
      const recorded = !views.has(key);
      views.add(key);
      return recorded;
    },
    async count(resourceId) {
      return [...views].filter((key) => key.startsWith(`${resourceId}:`)).length;
    },
  };
}

describe("unique resource views", () => {
  test("counts each authenticated user once per resource", async () => {
    const store = inMemoryViewStore();

    expect(await recordUniqueResourceView(store, "pdf", "user-a")).toEqual({
      recorded: true,
      views: 1,
    });
    expect(await recordUniqueResourceView(store, "pdf", "user-a")).toEqual({
      recorded: false,
      views: 1,
    });
    expect(await recordUniqueResourceView(store, "pdf", "user-b")).toEqual({
      recorded: true,
      views: 2,
    });
  });

  test("counts simultaneous requests from one user once", async () => {
    const store = inMemoryViewStore();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        recordUniqueResourceView(store, "pdf", "user-a"),
      ),
    );

    expect(results.filter((result) => result.recorded)).toHaveLength(1);
    expect(results.every((result) => result.views === 1)).toBe(true);
  });

  test("keeps unique viewers isolated between resources", async () => {
    const store = inMemoryViewStore();

    expect(await recordUniqueResourceView(store, "pdf-a", "user-a")).toEqual({
      recorded: true,
      views: 1,
    });
    expect(await recordUniqueResourceView(store, "pdf-b", "user-a")).toEqual({
      recorded: true,
      views: 1,
    });
  });
});
