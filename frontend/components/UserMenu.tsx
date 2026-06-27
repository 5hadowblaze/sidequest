"use client";

import UserAvatar from "@/components/UserAvatar";
import type { AuthUser } from "@/lib/types";

interface UserMenuProps {
  user: AuthUser;
  homeCity?: string;
  onSignOut: () => void;
  onEditProfile: () => void;
}

export default function UserMenu({
  user,
  homeCity,
  onSignOut,
  onEditProfile,
}: UserMenuProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {homeCity && (
        <div className="hidden items-center gap-2 rounded-full bg-purple-soft px-4 py-2 text-sm text-purple-deep sm:flex">
          <span aria-hidden>📍</span>
          <span className="font-medium">{homeCity}</span>
        </div>
      )}

      <div className="group relative">
        <button
          type="button"
          className="btn-press flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 shadow-sm transition hover:border-border-strong sm:pr-3"
        >
          <UserAvatar
            displayName={user.displayName}
            email={user.email}
            photoURL={user.photoURL}
          />
          <span className="hidden text-sm font-medium text-foreground md:inline">
            {user.displayName ?? user.email ?? "Account"}
          </span>
        </button>

        <div className="invisible absolute right-0 top-full z-20 mt-2 w-56 translate-y-1 rounded-2xl border border-border bg-surface py-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.displayName ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-muted-light">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-purple-soft hover:text-purple-deep"
          >
            Edit preferences
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-coral transition hover:bg-coral-soft"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
