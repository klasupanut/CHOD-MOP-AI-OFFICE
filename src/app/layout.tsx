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

const themeBootScript = `
(() => {
  try {
    const key = "chod-theme-mode:v1";
    const stored = window.localStorage.getItem(key);
    const mode = stored === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  } catch {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <BrowserOriginGuard />
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
