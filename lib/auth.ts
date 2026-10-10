import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { recordCustomerLogin } from "@/lib/store";

export function isAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET &&
    process.env.NEXTAUTH_URL,
  );
}

export const authOptions: NextAuthOptions = {
  providers:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : [],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (
        account?.provider === "google" &&
        (profile as { email_verified?: boolean })?.email_verified === true
      ) {
        if (user?.email) {
          try {
            const avatar = user.image || (profile as any)?.picture || null;
            await recordCustomerLogin(user.email, user.name, avatar);
          } catch (err) {
            console.error("Failed to sync customer on signIn:", err);
          }
        }
        return true;
      }
      return false;
    },
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image || (profile as any)?.picture || token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = (token.picture as string) || session.user.image;
      }
      return session;
    },
  },
};
