import type { NextAuthOptions } from "next-auth";

const issuer = process.env.EARTHID_ISSUER?.replace(/\/$/, "");
const clientId = process.env.EARTHID_CLIENT_ID;
const clientSecret = process.env.EARTHID_CLIENT_SECRET;

if (!issuer || !clientId || !clientSecret || !process.env.NEXTAUTH_SECRET) {
  throw new Error("Set EARTHID_ISSUER, EARTHID_CLIENT_ID, EARTHID_CLIENT_SECRET and NEXTAUTH_SECRET");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    {
      id: "earthid",
      name: "EarthID Enterprise",
      type: "oauth",
      wellKnown: issuer + "/.well-known/openid-configuration",
      clientId,
      clientSecret,
      client: { token_endpoint_auth_method: "client_secret_basic" },
      idToken: true,
      checks: ["pkce", "state", "nonce"],
      authorization: {
        params: {
          response_type: "code",
          scope: "openid profile email"
        }
      },
      profile(profile) {
        return {
          id: String(profile.sub),
          name: typeof profile.name === "string" ? profile.name : null,
          email: typeof profile.email === "string" ? profile.email : null
        };
      }
    }
  ],
  callbacks: {
    async jwt({ token, account }) {
      // This is the IdP's subject, not the user's email address.
      if (account?.provider === "earthid") {
        token.earthidSub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.earthidSub = token.earthidSub;
      return session;
    }
  }
};
