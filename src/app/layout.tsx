import type { ReactNode } from "react";

export const metadata = {
  title: "CarePilot",
  description: "A personal health companion that remembers across sessions.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
