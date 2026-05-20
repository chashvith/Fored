import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fredoka, Merriweather } from "next/font/google";
import { ThemeController } from "@/components/theme-controller";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const reader = Merriweather({
  subsets: ["latin"],
  variable: "--font-reader",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Focusread",
  description:
    "A dark, immersive reading experience with a signature blue-purple gradient identity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const theme = localStorage.getItem('focusread-theme'); document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'; document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'; } catch (e) { document.documentElement.dataset.theme = 'dark'; document.documentElement.style.colorScheme = 'dark'; } })();`,
          }}
        />
      </head>
      <body
        className={`${display.variable} ${body.variable} ${reader.variable} min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] antialiased`}
      >
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
