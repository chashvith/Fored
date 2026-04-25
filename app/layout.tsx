import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fredoka } from "next/font/google";
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
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} bg-base text-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
