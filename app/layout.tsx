import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/app/context/ThemeContext";

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
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <ThemeProvider>
          <Sidebar />
          <main className="layout-main">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
