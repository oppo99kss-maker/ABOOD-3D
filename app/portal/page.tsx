import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import { Portal } from "@/components/portal/portal";
export const dynamic = "force-dynamic";
export default async function PortalPage() {
  if (!isAuthConfigured()) redirect("/");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  return (
    <Portal
      user={{
        name: session.user.name || "ABOOD 3D",
        email: session.user.email || "",
      }}
    />
  );
}
