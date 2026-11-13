import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    earthidSub?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    earthidSub?: string;
  }
}
