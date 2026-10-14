import type { Response } from "express";
import type { ZodType } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { CommunityServiceError } from "./community.domain.js";
import {
  createCommentSchema,
  createCommunitySchema,
  createPostSchema,
  idSchema,
  listCommunitiesSchema,
  listPostsSchema,
  slugSchema,
  updateCommentSchema,
  updatePostSchema,
  voteSchema,
} from "./community.schema.js";
import * as service from "./community.service.js";

function parse<T>(schema: ZodType<T>, value: unknown, res: Response): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

function userId(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return req.userId;
}

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof CommunityServiceError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: fallback });
}

export async function communities(req: AuthenticatedRequest, res: Response) {
  const input = parse(listCommunitiesSchema, req.query, res);
  if (!input) return;
  try { res.json(await service.listCommunities(req.userId, input)); }
  catch (error) { fail(res, error, "Failed to fetch communities"); }
}

export async function community(req: AuthenticatedRequest, res: Response) {
  const params = parse(slugSchema, req.params, res);
  if (!params) return;
  try { res.json({ community: await service.getCommunity(params.slug, req.userId) }); }
  catch (error) { fail(res, error, "Failed to fetch community"); }
}

export async function addCommunity(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const input = parse(createCommunitySchema, req.body, res);
  if (!id || !input) return;
  try { res.status(201).json({ community: await service.createCommunity(id, input) }); }
  catch (error) { fail(res, error, "Failed to create community"); }
}

export async function join(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(slugSchema, req.params, res);
  if (!id || !params) return;
  try { res.json({ community: await service.joinCommunity(id, params.slug) }); }
  catch (error) { fail(res, error, "Failed to join community"); }
}

export async function leave(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(slugSchema, req.params, res);
  if (!id || !params) return;
  try { res.json({ community: await service.leaveCommunity(id, params.slug) }); }
  catch (error) { fail(res, error, "Failed to leave community"); }
}

export async function posts(req: AuthenticatedRequest, res: Response) {
  const input = parse(listPostsSchema, req.query, res);
  if (!input) return;
  try { res.json(await service.listPosts(req.userId, input)); }
  catch (error) { fail(res, error, "Failed to fetch posts"); }
}

export async function post(req: AuthenticatedRequest, res: Response) {
  const params = parse(idSchema, req.params, res);
  if (!params) return;
  try { res.json({ post: await service.getPost(params.id, req.userId) }); }
  catch (error) { fail(res, error, "Failed to fetch post"); }
}

export async function addPost(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const input = parse(createPostSchema, req.body, res);
  if (!id || !input) return;
  try { res.status(201).json({ post: await service.createPost(id, input) }); }
  catch (error) { fail(res, error, "Failed to create post"); }
}

export async function editPost(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(idSchema, req.params, res);
  const input = parse(updatePostSchema, req.body, res);
  if (!id || !params || !input) return;
  try { res.json({ post: await service.updatePost(id, params.id, input) }); }
  catch (error) { fail(res, error, "Failed to update post"); }
}

export async function removePost(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(idSchema, req.params, res);
  if (!id || !params) return;
  try { await service.deletePost(id, params.id); res.json({ message: "Post deleted" }); }
  catch (error) { fail(res, error, "Failed to delete post"); }
}

export async function vote(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(idSchema, req.params, res);
  const input = parse(voteSchema, req.body, res);
  if (!id || !params || !input) return;
  try { res.json(await service.voteOnPost(id, params.id, input.value)); }
  catch (error) { fail(res, error, "Failed to vote on post"); }
}

export async function comments(req: AuthenticatedRequest, res: Response) {
  const params = parse(idSchema, req.params, res);
  if (!params) return;
  try { res.json({ comments: await service.listComments(params.id) }); }
  catch (error) { fail(res, error, "Failed to fetch comments"); }
}

export async function addComment(req: AuthenticatedRequest, res: Response) {
  const id = userId(req, res);
  const params = parse(idSchema, req.params, res);
  const input = parse(createCommentSchema, req.body, res);
  if (!id || !params || !input) return;
  try { res.status(201).json({ comment: await service.createComment(id, params.id, input) }); }
  catch (error) { fail(res, error, "Failed to add comment"); }
}

export async function editComment(req: AuthenticatedRequest, res: Response) {
  const user = userId(req, res);
  const params = parse(idSchema, req.params, res);
  const input = parse(updateCommentSchema, req.body, res);
  if (!user || !params || !input) return;
  try { res.json({ comment: await service.updateComment(user, params.id, input.content) }); }
  catch (error) { fail(res, error, "Failed to update comment"); }
}

export async function removeComment(req: AuthenticatedRequest, res: Response) {
  const user = userId(req, res);
  const params = parse(idSchema, req.params, res);
  if (!user || !params) return;
  try { await service.deleteComment(user, params.id); res.json({ message: "Comment deleted" }); }
  catch (error) { fail(res, error, "Failed to delete comment"); }
}
