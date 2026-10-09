import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <img src="/brand.svg" alt="ABOOD 3D" width="72" height="72" />
      <h1>404</h1>
      <p>الصفحة غير موجودة</p>
      <Link href="/" className="primary-button">
        العودة للرئيسية
      </Link>
    </main>
  );
}
