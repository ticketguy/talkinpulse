import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

async function determineRepLevel(xProfile: any): Promise<string> {
  // AI-free heuristic from X profile data
  const followersCount = xProfile?.public_metrics?.followers_count || xProfile?.followers_count || 0;
  const tweetCount = xProfile?.public_metrics?.tweet_count || xProfile?.statuses_count || 0;
  const bio = (xProfile?.description || xProfile?.bio || "").toLowerCase();

  const cryptoKeywords = ["defi", "nft", "crypto", "web3", "blockchain", "solana", "ethereum", "bitcoin", "trader", "builder", "protocol", "dao", "degen", "ape", "hodl", "wagmi"];
  const cryptoBioScore = cryptoKeywords.filter(k => bio.includes(k)).length;

  if (followersCount > 50000 && cryptoBioScore >= 2) return "CT_ORACLE";
  if (followersCount > 10000 && cryptoBioScore >= 2) return "VERIFIED_VOICE";
  if (followersCount > 2000 && cryptoBioScore >= 1) return "SIGNAL_CALLER";
  if (followersCount > 500 || cryptoBioScore >= 2) return "CALLER";
  if (cryptoBioScore >= 1 || tweetCount > 100) return "WEB3_ASSOCIATE";
  return "NEW_WEB3";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        params: { scope: "tweet.read tweet.write users.read offline.access" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "twitter" && profile) {
        const xProfile = profile as any;
        const xId = xProfile.data?.id || xProfile.id_str || user.id!;
        const username = xProfile.data?.username || xProfile.screen_name || user.name?.toLowerCase().replace(/\s/g, "") || "";
        const displayName = xProfile.data?.name || xProfile.name || user.name || "";
        const imageUrl = xProfile.data?.profile_image_url || xProfile.profile_image_url_https || user.image;
        const bio = xProfile.data?.description || xProfile.description || "";

        try {
          const existing = await prisma.user.findUnique({ where: { xId } });

          if (!existing) {
            const repLevel = await determineRepLevel(xProfile.data || xProfile);
            const isOwner = username.toLowerCase() === "0xticketguy";

            const newUser = await prisma.user.create({
              data: {
                xId, username, displayName, imageUrl, bio,
                repScore: 0,
                repLevel: repLevel as any,
                talkinPoints: 100,
                isAdmin: isOwner,
                adminRole: isOwner ? "SUPER_ADMIN" : null,
                xProfileData: xProfile.data || xProfile,
              },
            });

            // Record signup bonus transaction
            await prisma.pointTransaction.create({
              data: {
                userId: newUser.id,
                amount: 100,
                type: "signup",
                description: "Welcome bonus — 100 Talkin Points",
              },
            });
          } else {
            // Update profile on each login
            await prisma.user.update({
              where: { xId },
              data: { displayName, imageUrl, bio, xProfileData: xProfile.data || xProfile },
            });
          }
        } catch (e) {
          console.error("Auth signIn error:", e);
        }
      }
      return true;
    },

    async jwt({ token, account, profile }) {
      if (account?.provider === "twitter") {
        token.accessToken = account.access_token;
        const xProfile = profile as any;
        token.sub = xProfile?.data?.id || xProfile?.id_str || token.sub;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findFirst({ where: { xId: token.sub as string } });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).username = dbUser.username;
          (session.user as any).repScore = dbUser.repScore;
          (session.user as any).repLevel = dbUser.repLevel;
          (session.user as any).talkinPoints = dbUser.talkinPoints;
          (session.user as any).isAdmin = dbUser.isAdmin;
          (session.user as any).adminRole = dbUser.adminRole;
          (session.user as any).xId = dbUser.xId;
        }
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
