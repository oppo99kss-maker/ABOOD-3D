import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast-container";

export const metadata: Metadata = {
  title: "SpooFX | حسابك ومنتجاتك ومفاتيحك",
  description: "سجّل الدخول للوصول إلى حسابك ومنتجاتك ومفاتيحك عبر SpooFX",
  icons: { icon: "/brand.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
