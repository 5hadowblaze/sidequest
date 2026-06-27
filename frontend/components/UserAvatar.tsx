"use client";

import { useEffect, useState } from "react";

export function getUserInitials(
  displayName: string | null,
  email: string | null,
): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
  }
  return email?.charAt(0)?.toUpperCase() ?? "?";
}

interface UserAvatarProps {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  className?: string;
}

export default function UserAvatar({
  displayName,
  email,
  photoURL,
  className = "h-8 w-8",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getUserInitials(displayName, email);

  useEffect(() => {
    setImageFailed(false);
  }, [photoURL]);

  if (photoURL && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${className} rounded-full object-cover ring-2 ring-purple-soft`}
      />
    );
  }

  return (
    <span
      className={`flex ${className} items-center justify-center rounded-full bg-logo-gradient text-sm font-semibold text-white`}
    >
      {initials}
    </span>
  );
}
