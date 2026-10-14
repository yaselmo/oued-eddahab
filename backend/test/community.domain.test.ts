import { describe, expect, test } from "bun:test";
import { createCommunitySchema, createPostSchema } from "../src/modules/community/community.schema.js";
import { assertOwner, CommunityServiceError, voteDelta } from "../src/modules/community/community.domain.js";

describe("community creation", () => {
  test("accepts a valid community and normalizes its slug", () => {
    const result = createCommunitySchema.parse({
      name: "Computer Science",
      slug: "Computer-Science",
      description: "A place for Moroccan computer science students.",
    });
    expect(result.slug).toBe("computer-science");
  });

  test("rejects unsafe slugs and short descriptions", () => {
    expect(createCommunitySchema.safeParse({ name: "Test", slug: "../admin", description: "short" }).success).toBe(false);
  });
});

describe("post creation and ownership", () => {
  test("requires a community, title, and content", () => {
    expect(createPostSchema.safeParse({ communitySlug: "general", title: "A useful question", content: "What do you think?" }).success).toBe(true);
    expect(createPostSchema.safeParse({ communitySlug: "general", title: "No", content: "" }).success).toBe(false);
  });

  test("prevents another user from managing a post", () => {
    expect(() => assertOwner("author", "other-user", "post")).toThrow(CommunityServiceError);
    expect(() => assertOwner("author", "author", "post")).not.toThrow();
  });
});

describe("vote uniqueness and switching", () => {
  test("calculates score changes for create, switch, and removal", () => {
    expect(voteDelta(0, 1)).toBe(1);
    expect(voteDelta(1, -1)).toBe(-2);
    expect(voteDelta(-1, 0)).toBe(1);
    expect(voteDelta(1, 1)).toBe(0);
  });
});

describe("comment ownership", () => {
  test("uses the same author-only rule as posts", () => {
    expect(() => assertOwner("commenter", "intruder", "comment")).toThrow("own comment");
  });
});
