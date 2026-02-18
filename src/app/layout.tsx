import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Sérsteypan - Factory Management",
  description: "Modern production management for specialty concrete",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sérsteypan",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="is">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
