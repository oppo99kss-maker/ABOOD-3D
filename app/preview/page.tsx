import { Portal } from "@/components/portal/portal";
export const metadata = {
  title: "SpooFX | معاينة التصميم",
  robots: { index: false, follow: false },
};
export default function Preview() {
  return <Portal preview user={{ name: "زائر / Guest", email: "" }} />;
}
