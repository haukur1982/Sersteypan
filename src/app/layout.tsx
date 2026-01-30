import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Sérsteypan - Factory Management",
  description: "Modern production management for specialty concrete",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
