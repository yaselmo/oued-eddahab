import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../lib/prisma.js";
import { assertOwner, CommunityServiceError, isUniqueConstraintError, voteDelta } from "./community.domain.js";
import type { CreateCommentInput, CreateCommunityInput, CreatePostInput, UpdatePostInput } from "./community.schema.js";

const publicUser = { id: true, username: true, avatarUrl: true } as const;
const publicInstitution = { id: true, name: true, abbreviation: true, city: true } as const;

const communityInclude = (userId?: string) => ({
  creator: { select: publicUser },
  institution: { select: publicInstitution },
  members: userId ? { where: { userId }, select: { role: true } } : false,
}) satisfies Prisma.CommunityInclude;

const postInclude = {
  author: { select: publicUser },
  community: { select: { id: true, name: true, slug: true, imageUrl: true } },
} satisfies Prisma.PostInclude;

function shapeCommunity<T extends { members?: Array<{ role: string }> }>(community: T) {
  const { members, ...rest } = community;
  return { ...rest, isJoined: Boolean(members?.length), memberRole: members?.[0]?.role ?? null };
}

async function addUserVotes<T extends { id: string }>(posts: T[], userId?: string) {
  if (!userId || posts.length === 0) return posts.map((post) => ({ ...post, userVote: 0 }));
  const votes = await prisma.postVote.findMany({
    where: { userId, postId: { in: posts.map((post) => post.id) } },
    select: { postId: true, value: true },
  });
  const byPost = new Map(votes.map((vote) => [vote.postId, vote.value]));
  return posts.map((post) => ({ ...post, userVote: byPost.get(post.id) ?? 0 }));
}

export async function listCommunities(userId: string | undefined, input: {
  search?: string; institutionId?: string; joined?: boolean; page: number; limit: number;
}) {
  const filters: Prisma.CommunityWhereInput[] = [];
  if (input.search) filters.push({ OR: [
    { name: { contains: input.search, mode: "insensitive" } },
    { slug: { contains: input.search, mode: "insensitive" } },
    { description: { contains: input.search, mode: "insensitive" } },
  ] });
  if (input.institutionId) filters.push({ OR: [
    { institutionId: input.institutionId },
    { institutionId: null },
  ] });
  const where: Prisma.CommunityWhereInput = {
    ...(filters.length ? { AND: filters } : {}),
    ...(input.joined && userId ? { members: { some: { userId } } } : {}),
  };
  if (input.joined && !userId) return { communities: [], page: input.page, hasMore: false };

  const communities = await prisma.community.findMany({
    where,
    include: communityInclude(userId),
    orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
    skip: (input.page - 1) * input.limit,
    take: input.limit + 1,
  });
  const hasMore = communities.length > input.limit;
  return { communities: communities.slice(0, input.limit).map(shapeCommunity), page: input.page, hasMore };
}

export async function getCommunity(slug: string, userId?: string) {
  const community = await prisma.community.findUnique({ where: { slug }, include: communityInclude(userId) });
  if (!community) throw new CommunityServiceError("Community not found", 404);
  return shapeCommunity(community);
}

export async function createCommunity(userId: string, input: CreateCommunityInput) {
  if (input.institutionId) {
    const institution = await prisma.institution.findUnique({ where: { id: input.institutionId }, select: { id: true } });
    if (!institution) throw new CommunityServiceError("Institution not found", 400);
  }
  try {
    const community = await prisma.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: { ...input, imageUrl: input.imageUrl || null, institutionId: input.institutionId || null, creatorId: userId, memberCount: 1 },
      });
      await tx.communityMember.create({ data: { userId, communityId: created.id, role: "ADMIN" } });
      return tx.community.findUniqueOrThrow({ where: { id: created.id }, include: communityInclude(userId) });
    });
    return shapeCommunity(community);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new CommunityServiceError("That community slug is already taken.", 409);
    throw error;
  }
}

export async function joinCommunity(userId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
  if (!community) throw new CommunityServiceError("Community not found", 404);
  try {
    await prisma.$transaction([
      prisma.communityMember.create({ data: { userId, communityId: community.id } }),
      prisma.community.update({ where: { id: community.id }, data: { memberCount: { increment: 1 } } }),
    ]);
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
  return getCommunity(slug, userId);
}

export async function leaveCommunity(userId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug }, select: { id: true, creatorId: true } });
  if (!community) throw new CommunityServiceError("Community not found", 404);
  if (community.creatorId === userId) throw new CommunityServiceError("Community creators cannot leave their community.", 400);
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.communityMember.deleteMany({ where: { userId, communityId: community.id } });
    if (deleted.count) await tx.community.update({ where: { id: community.id }, data: { memberCount: { decrement: 1 } } });
  });
  return getCommunity(slug, userId);
}

export async function listPosts(userId: string | undefined, input: {
  community?: string; feed: "for-you" | "latest" | "popular"; page: number; limit: number;
}) {
  const where: Prisma.PostWhereInput = { communityId: { not: null }, ...(input.community ? { community: { slug: input.community } } : {}) };
  if (input.feed === "for-you" && userId && !input.community) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true, communityMemberships: { select: { communityId: true } } } });
    if (user) where.OR = [
      { communityId: { in: user.communityMemberships.map((item) => item.communityId) } },
      ...(user.institutionId ? [{ community: { institutionId: user.institutionId } }] : []),
      { community: { institutionId: null } },
    ];
  }
  const orderBy: Prisma.PostOrderByWithRelationInput[] = input.feed === "popular"
    ? [{ voteScore: "desc" }, { commentCount: "desc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];
  const posts = await prisma.post.findMany({ where, include: postInclude, orderBy, skip: (input.page - 1) * input.limit, take: input.limit + 1 });
  const hasMore = posts.length > input.limit;
  return { posts: await addUserVotes(posts.slice(0, input.limit), userId), page: input.page, hasMore };
}

export async function getPost(id: string, userId?: string) {
  const post = await prisma.post.findFirst({ where: { id, communityId: { not: null } }, include: postInclude });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  return (await addUserVotes([post], userId))[0];
}

export async function createPost(userId: string, input: CreatePostInput) {
  const community = await prisma.community.findUnique({ where: { slug: input.communitySlug }, select: { id: true } });
  if (!community) throw new CommunityServiceError("Community not found", 404);
  const post = await prisma.post.create({ data: { title: input.title, content: input.content, authorId: userId, communityId: community.id }, include: postInclude });
  return { ...post, userVote: 0 };
}

export async function updatePost(userId: string, id: string, input: UpdatePostInput) {
  const post = await prisma.post.findFirst({ where: { id, communityId: { not: null } }, select: { authorId: true } });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  assertOwner(post.authorId, userId, "post");
  return prisma.post.update({ where: { id }, data: input, include: postInclude });
}

export async function deletePost(userId: string, id: string) {
  const post = await prisma.post.findFirst({ where: { id, communityId: { not: null } }, select: { authorId: true } });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  assertOwner(post.authorId, userId, "post");
  await prisma.post.delete({ where: { id } });
}

export async function voteOnPost(userId: string, id: string, value: -1 | 0 | 1) {
  const post = await prisma.post.findFirst({ where: { id, communityId: { not: null } }, select: { id: true } });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  return prisma.$transaction(async (tx) => {
    const previous = await tx.postVote.findUnique({ where: { userId_postId: { userId, postId: id } } });
    const delta = voteDelta(previous?.value ?? 0, value);
    if (value === 0) await tx.postVote.deleteMany({ where: { userId, postId: id } });
    else await tx.postVote.upsert({ where: { userId_postId: { userId, postId: id } }, create: { userId, postId: id, value }, update: { value } });
    const updated = delta ? await tx.post.update({ where: { id }, data: { voteScore: { increment: delta } }, select: { voteScore: true } }) : await tx.post.findUniqueOrThrow({ where: { id }, select: { voteScore: true } });
    return { voteScore: updated.voteScore, userVote: value };
  });
}

const commentInclude = { author: { select: publicUser } } satisfies Prisma.CommentInclude;

export async function listComments(postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, communityId: { not: null } }, select: { id: true } });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  return prisma.comment.findMany({ where: { postId }, include: commentInclude, orderBy: { createdAt: "asc" }, take: 200 });
}

export async function createComment(userId: string, postId: string, input: CreateCommentInput) {
  const post = await prisma.post.findFirst({ where: { id: postId, communityId: { not: null } }, select: { id: true } });
  if (!post) throw new CommunityServiceError("Post not found", 404);
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: input.parentId, postId }, select: { id: true } });
    if (!parent) throw new CommunityServiceError("Parent comment not found", 400);
  }
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { content: input.content, parentId: input.parentId || null, authorId: userId, postId }, include: commentInclude });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return comment;
  });
}

export async function updateComment(userId: string, id: string, content: string) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
  if (!comment) throw new CommunityServiceError("Comment not found", 404);
  assertOwner(comment.authorId, userId, "comment");
  return prisma.comment.update({ where: { id }, data: { content }, include: commentInclude });
}

export async function deleteComment(userId: string, id: string) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true, postId: true } });
  if (!comment) throw new CommunityServiceError("Comment not found", 404);
  assertOwner(comment.authorId, userId, "comment");
  await prisma.$transaction(async (tx) => {
    const descendants = await tx.comment.count({ where: { parentId: id } });
    await tx.comment.delete({ where: { id } });
    await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 + descendants } } });
  });
}
