import { isAuthConfigured } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { configured: isAuthConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
