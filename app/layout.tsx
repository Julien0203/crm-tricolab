import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Thomas CRM",
  description: "CRM commercial moderne",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" style={{ background: '#0f1117' }}>
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', background: '#0f1117' }}>
        <Sidebar />
        <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', padding: '32px 32px', background: '#0f1117' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
