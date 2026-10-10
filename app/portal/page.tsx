import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import { Portal } from "@/components/portal/portal";
import { recordCustomerLogin, pool, ready } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  if (!isAuthConfigured()) redirect("/");
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  let userImage = session.user.image || null;
  const userName = session.user.name || session.user.email.split("@")[0];

  try {
    await recordCustomerLogin(session.user.email, userName, userImage);
    if (!userImage) {
      await ready();
      const { rows } = await pool().query(
        "SELECT image FROM customers WHERE lower(email) = $1 LIMIT 1",
        [session.user.email.toLowerCase()]
      );
      if (rows[0]?.image) {
        userImage = rows[0].image;
      }
    }
  } catch (err) {
    console.error("Customer sync error in PortalPage:", err);
  }

  return (
    <Portal
      user={{
        name: userName,
        email: session.user.email,
        image: userImage,
      }}
    />
  );
}
