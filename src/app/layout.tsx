import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Dashboard",
  description: "Local dashboard for concurrent Codex sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
