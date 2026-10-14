-- Extend the existing post and comment tables without changing club behavior.
ALTER TABLE "Post"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "communityId" TEXT,
  ADD COLUMN "voteScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

-- Existing comments need an accurate cached count before the API starts using it.
UPDATE "Post" AS post
SET "commentCount" = (
  SELECT COUNT(*)::INTEGER
  FROM "Comment" AS comment
  WHERE comment."postId" = post."id"
);

CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');

CREATE TABLE "Community" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT,
  "creatorId" TEXT NOT NULL,
  "institutionId" TEXT,
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostVote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PostVote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostVote_value_check" CHECK ("value" IN (-1, 1))
);

CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");
CREATE INDEX "Community_creatorId_idx" ON "Community"("creatorId");
CREATE INDEX "Community_institutionId_idx" ON "Community"("institutionId");
CREATE INDEX "Community_memberCount_idx" ON "Community"("memberCount");
CREATE INDEX "Community_createdAt_idx" ON "Community"("createdAt");

CREATE UNIQUE INDEX "CommunityMember_userId_communityId_key" ON "CommunityMember"("userId", "communityId");
CREATE INDEX "CommunityMember_communityId_joinedAt_idx" ON "CommunityMember"("communityId", "joinedAt");
CREATE INDEX "CommunityMember_userId_idx" ON "CommunityMember"("userId");

CREATE UNIQUE INDEX "PostVote_userId_postId_key" ON "PostVote"("userId", "postId");
CREATE INDEX "PostVote_postId_idx" ON "PostVote"("postId");
CREATE INDEX "PostVote_userId_idx" ON "PostVote"("userId");

CREATE INDEX "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt");
CREATE INDEX "Post_communityId_voteScore_idx" ON "Post"("communityId", "voteScore");
CREATE INDEX "Post_voteScore_idx" ON "Post"("voteScore");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

ALTER TABLE "Community"
  ADD CONSTRAINT "Community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Community_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityMember"
  ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostVote"
  ADD CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
