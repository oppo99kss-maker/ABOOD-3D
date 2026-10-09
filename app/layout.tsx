import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ABOOD 3D | بوابة المنتجات",
  description: "بوابة ABOOD 3D للمنتجات والتراخيص والدعم",
  icons: { icon: "/brand.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
