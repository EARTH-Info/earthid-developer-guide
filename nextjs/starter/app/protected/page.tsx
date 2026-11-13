import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth-options";

export const dynamic = "force-dynamic";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <main>
      <h1>Protected page</h1>
      <p>Authenticated with EarthID. Access to your business API still requires authorization checks.</p>
      <dl>
        <dt>External subject (sub)</dt>
        <dd>{session.earthidSub || "Not provided"}</dd>
        <dt>Display name</dt>
        <dd>{session.user?.name || "Not provided"}</dd>
        <dt>Email</dt>
        <dd>{session.user?.email || "Not provided"}</dd>
      </dl>
      <p><Link href="/">Back to home / local sign-out</Link></p>
    </main>
  );
}
