import NextAuth from "next-auth";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import type { NextRequest } from "next/server";
const handler = NextAuth(authOptions);
async function route(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (!isAuthConfigured())
    return Response.json(
      { error: "Google sign-in is not configured yet." },
      { status: 503 },
    );
  return handler(request, context);
}
export { route as GET, route as POST };
