import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import { LoginPage } from "@/components/portal/login-page";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (isAuthConfigured() && (await getServerSession(authOptions))?.user)
    redirect("/portal");
  return <LoginPage />;
}
