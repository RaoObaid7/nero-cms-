import type { ReactNode } from "react";
import "../tuyba.css";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
