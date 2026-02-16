// CRITICAL
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a1917",
};

export const metadata: Metadata = {
  title: "vLLM Studio",
  description: "Model management for vLLM and SGLang",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "vLLM Studio",
  },
  icons: {
    icon: [
      { url: "/mocks/logo-1.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="warm-paper" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/mocks/logo-1.svg" type="image/svg+xml" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = JSON.parse(localStorage.getItem('vllm-studio-chat-state') || '{}');
                var t = (s.state || s).themeId;
                if (t) document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
              const isProd = ${process.env.NODE_ENV === "production" ? "true" : "false"};
              if (isProd && 'serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
              const setAppHeight = () => {
                document.documentElement.style.setProperty('--app-height', \`\${window.innerHeight}px\`);
              };
              window.addEventListener('resize', setAppHeight);
              window.addEventListener('orientationchange', setAppHeight);
              setAppHeight();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <AppSidebar>{children}</AppSidebar>
        </Providers>
      </body>
    </html>
  );
}
