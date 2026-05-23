import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      // tweet.write scope needed for Share to X feature
      authorization: {
        params: {
          scope: "tweet.read tweet.write users.read offline.access",
        },
      },
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
              imageUrl:
                xProfile.data?.profile_image_url ||
                xProfile.profile_image_url_https ||
                user.image,
              username:
                xProfile.data?.username ||
                xProfile.screen_name ||
                user.name?.toLowerCase().replace(/\s/g, "") ||
                "",
            },
            create: {
              xId: xProfile.data?.id || xProfile.id_str || user.id!,
              username:
                xProfile.data?.username ||
                xProfile.screen_name ||
                user.name?.toLowerCase().replace(/\s/g, "") ||
                "",
              displayName:
                xProfile.data?.name || xProfile.name || user.name || "",
              imageUrl:
                xProfile.data?.profile_image_url ||
                xProfile.profile_image_url_https ||
                user.image,
              repScore: 120,
            },
          });
        } catch (e) {
          console.error("User upsert failed:", e);
        }
      }
      return true;
    },

    async jwt({ token, account, profile }) {
      // Store X access token in JWT so we can post tweets on user's behalf
      if (account?.provider === "twitter") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        const xProfile = profile as any;
        token.sub = xProfile?.data?.id || xProfile?.id_str || token.sub;
      }
      return token;
    },

    async session({ session, token }) {
      // Surface access token and user details to session
      (session as any).accessToken = token.accessToken;

      if (session.user && token.sub) {
        const dbUser = await prisma.user.findFirst({
          where: { xId: token.sub as string },
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
  },
  pages: {
    signIn: "/",
  },
});
