import { z } from "zod";

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(15);

export const slugSchema = z.object({
  slug: z.string().trim().min(3).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const idSchema = z.object({ id: z.string().uuid() });

export const listCommunitiesSchema = z.object({
  search: z.string().trim().max(80).optional(),
  institutionId: z.string().trim().min(1).max(80).optional(),
  joined: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  page,
  limit,
});

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(60),
  slug: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(20).max(500),
  imageUrl: z.string().url().max(500).optional().nullable(),
  institutionId: z.string().trim().min(1).max(80).optional().nullable(),
});

export const listPostsSchema = z.object({
  community: z.string().trim().max(50).optional(),
  feed: z.enum(["for-you", "latest", "popular"]).default("for-you"),
  page,
  limit,
});

export const createPostSchema = z.object({
  communitySlug: z.string().trim().min(3).max(50),
  title: z.string().trim().min(5).max(180),
  content: z.string().trim().min(1).max(10_000),
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(5).max(180).optional(),
  content: z.string().trim().min(1).max(10_000).optional(),
}).refine((input) => input.title !== undefined || input.content !== undefined, {
  message: "At least one field is required",
});

export const voteSchema = z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(3_000),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(3_000),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
