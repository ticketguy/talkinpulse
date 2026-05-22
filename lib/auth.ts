import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "twitter" && profile) {
        const xProfile = profile as any;
        try {
          await prisma.user.upsert({
            where: { xId: xProfile.data?.id || xProfile.id_str || user.id! },
            update: {
              displayName: xProfile.data?.name || xProfile.name || user.name || "",
              imageUrl: xProfile.data?.profile_image_url || xProfile.profile_image_url_https || user.image,
              username: xProfile.data?.username || xProfile.screen_name || user.name?.toLowerCase().replace(/\s/g, "") || "",
            },
            create: {
              xId: xProfile.data?.id || xProfile.id_str || user.id!,
              username: xProfile.data?.username || xProfile.screen_name || user.name?.toLowerCase().replace(/\s/g, "") || "",
              displayName: xProfile.data?.name || xProfile.name || user.name || "",
              imageUrl: xProfile.data?.profile_image_url || xProfile.profile_image_url_https || user.image,
              repScore: 120,
            },
          });
        } catch (e) {
          console.error("User upsert failed:", e);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findFirst({
          where: { xId: token.sub },
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).username = dbUser.username;
          (session.user as any).repScore = dbUser.repScore;
          (session.user as any).xId = dbUser.xId;
        }
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        const xProfile = profile as any;
        token.sub = xProfile.data?.id || xProfile.id_str || token.sub;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
});
