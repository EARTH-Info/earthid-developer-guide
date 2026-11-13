import type { ReactNode } from "react";

export const metadata = { title: "EarthID Next.js OIDC Starter" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: "3rem auto", maxWidth: 700, padding: "0 1rem", lineHeight: 1.6 }}>
        {children}
      </body>
    </html>
  );
}
