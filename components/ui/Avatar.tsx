"use client";
import { generateAvatarUrl } from "@/lib/utils";

interface AvatarProps {
  username: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ username, imageUrl, size = 36, className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={username}
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, width: size, height: size }}
      />
    );
  }

  const { h, h2, initials } = generateAvatarUrl(username);
  const id = `av-${username.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      className={className}
      style={{ borderRadius: "50%", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${h},65%,55%)`} />
          <stop offset="100%" stopColor={`hsl(${h2},55%,40%)`} />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="18" fill={`url(#${id})`} />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="'Syne', sans-serif"
        fill="white"
      >
        {initials}
      </text>
    </svg>
  );
}
