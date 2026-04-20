// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DyslexiLens – Read anything, more easily",
  description:
    "Point your camera at any text. DyslexiLens simplifies, chunks, and explains it for easier reading.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  themeColor: "#F4A723",
  viewportFit: "cover", // Edge-to-edge on notched phones
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-lexend:   'Lexend', Arial, sans-serif;
            --font-atkinson: 'Atkinson Hyperlegible', Arial, sans-serif;
          }
        `}</style>
      </head>
      <body className="bg-cream-50 text-ink-900 font-sans antialiased min-h-screen pb-safe">
        {children}
      </body>
    </html>
  );
}
