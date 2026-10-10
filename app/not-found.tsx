import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <img src="/logo.png" alt="SpooFX" width="80" height="80" style={{ borderRadius: 16, objectFit: "contain" }} />
      <h1>404</h1>
      <p>الصفحة غير موجودة</p>
      <Link href="/" className="primary-button">
        العودة للرئيسية
      </Link>
    </main>
  );
}
