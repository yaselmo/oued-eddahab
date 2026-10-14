export type PublicUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type Institution = {
  id: string;
  name: string;
  abbreviation: string | null;
  city: string;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  creatorId: string;
  institutionId: string | null;
  memberCount: number;
  creator: PublicUser;
  institution: Institution | null;
  isJoined: boolean;
  memberRole: "MEMBER" | "MODERATOR" | "ADMIN" | null;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  title: string | null;
  content: string;
  authorId: string;
  author: PublicUser;
  community: Pick<Community, "id" | "name" | "slug" | "imageUrl">;
  voteScore: number;
  commentCount: number;
  userVote: -1 | 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId: string | null;
  author: PublicUser;
  createdAt: string;
  updatedAt: string;
};

export type FeedTab = "for-you" | "latest" | "popular";
