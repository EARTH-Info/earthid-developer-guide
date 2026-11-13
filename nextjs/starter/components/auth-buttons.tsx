"use client";

import { signIn, signOut } from "next-auth/react";

export function AuthButtons({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <button onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out from this app (local session)
    </button>
  ) : (
    <button onClick={() => signIn("earthid", { callbackUrl: "/protected" })}>
      Sign in with EarthID
    </button>
  );
}
