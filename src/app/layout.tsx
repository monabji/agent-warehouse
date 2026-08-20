import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Warehouse",
  description: "A live operations floor for collaborating AI agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
