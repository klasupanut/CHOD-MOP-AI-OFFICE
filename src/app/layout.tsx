import type { Metadata } from "next";
import { CustomCursor } from "@/components/cursor/CustomCursor";
import { BrowserOriginGuard } from "@/components/system/BrowserOriginGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHOD MOP OFFICE",
  description: "Operations command center for the CHOD MOP team.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <BrowserOriginGuard />
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
