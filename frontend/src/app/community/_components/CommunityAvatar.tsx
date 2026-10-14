import Image from "next/image";
import type { Community } from "./types";

type Props = {
  community: Pick<Community, "name" | "imageUrl">;
  size?: "sm" | "md" | "lg";
};

export default function CommunityAvatar({ community, size = "md" }: Props) {
  const sizes = {
    sm: "h-8 w-8 rounded-md text-xs",
    md: "h-10 w-10 rounded-lg text-sm",
    lg: "h-16 w-16 rounded-xl text-xl",
  };

  if (community.imageUrl) {
    return (
      <Image
        unoptimized
        src={community.imageUrl}
        alt=""
        width={64}
        height={64}
        className={`${sizes[size]} shrink-0 object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} flex shrink-0 items-center justify-center bg-emerald-100 font-bold text-emerald-900`}
    >
      {community.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
