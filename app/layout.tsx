import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import "./design-system.css";
import "./admin-workspace.css";
import "./interaction-effects.css";
import { StartupSplash } from "@/components/ui/startup-splash";
import { ToastContainer } from "@/components/ui/toast-container";

export const metadata: Metadata = {
  title: "SpooFX | حسابك ومنتجاتك ومفاتيحك",
  description: "سجّل الدخول للوصول إلى حسابك ومنتجاتك ومفاتيحك عبر SpooFX",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    apple: "/logo.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <body>
        <StartupSplash />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
