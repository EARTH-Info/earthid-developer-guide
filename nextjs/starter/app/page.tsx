import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth-options";
import { AuthButtons } from "../components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main>
      <h1>EarthID Enterprise — Next.js demo</h1>
      <p>Use your deployment-approved client registration to sign in.</p>
      <p>Session: <strong>{session ? "Signed in" : "Not signed in"}</strong></p>
      <AuthButtons signedIn={Boolean(session)} />
      <p><Link href="/protected">Open protected page</Link></p>
      <small>Signing out here clears this application session, not the central EarthID SSO session.</small>
    </main>
  );
}
