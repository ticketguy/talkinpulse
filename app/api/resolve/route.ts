import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { REP_LEVEL_THRESHOLDS } from "@/types";

async function checkRepLevelUp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const levels = Object.entries(REP_LEVEL_THRESHOLDS).sort((a, b) => b[1] - a[1]);
  for (const [level, threshold] of levels) {
    if (user.repScore >= threshold) {
      if (user.repLevel !== level) {
        await prisma.user.update({ where: { id: userId }, data: { repLevel: level as any } });
        // Bonus points for leveling up
        await prisma.$transaction([
          prisma.user.update({ where: { id: userId }, data: { talkinPoints: { increment: 50 } } }),
          prisma.pointTransaction.create({
            data: { userId, amount: 50, type: "rep_level_up", description: `Level up to ${level.replace(/_/g, " ")} — bonus 50 Talkin Points` },
          }),
        ]);
      }
      break;
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.isAdmin && user?.adminRole !== "SUPER_ADMIN" && user?.adminRole !== "MODERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId, outcome, resolutionNote } = await req.json();
    // outcome: "YES" | "NO" | "NEUTRAL"

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { votes: { include: { user: true } } },
    });

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.resolvedAt) return NextResponse.json({ error: "Already resolved" }, { status: 400 });

    const pool = post.pointsPool;
    const winners = post.votes.filter((v: any) => outcome === "NEUTRAL" || v.side === outcome.toLowerCase());
    const losers = post.votes.filter((v: any) => outcome !== "NEUTRAL" && v.side !== outcome.toLowerCase());
    const totalWinnerWager = winners.reduce((s: number, v: any) => s + v.pointsWagered, 0);

    const txns = [];

    if (outcome === "NEUTRAL") {
      // Everyone gets points back + bonus for participating
      for (const vote of post.votes) {
        const reward = vote.pointsWagered + 5;
        txns.push(
          prisma.user.update({ where: { id: vote.userId }, data: { talkinPoints: { increment: reward }, repScore: { increment: 5 } } }),
          prisma.vote.update({ where: { id: vote.id }, data: { pointsWon: reward } }),
          prisma.pointTransaction.create({
            data: { userId: vote.userId, amount: reward, type: "vote_neutral", description: `Neutral outcome — points returned + participation bonus`, postId },
          })
        );
        await checkRepLevelUp(vote.userId);
      }
    } else {
      // Winners split the losers' pool proportionally
      for (const vote of winners) {
        const share = totalWinnerWager > 0 ? Math.floor((vote.pointsWagered / totalWinnerWager) * pool) : vote.pointsWagered;
        txns.push(
          prisma.user.update({ where: { id: vote.userId }, data: { talkinPoints: { increment: share }, repScore: { increment: 10 } } }),
          prisma.vote.update({ where: { id: vote.id }, data: { pointsWon: share } }),
          prisma.pointTransaction.create({
            data: { userId: vote.userId, amount: share, type: "vote_win", description: `Won ${outcome} vote — "${post.title.slice(0, 50)}"`, postId },
          })
        );
        await checkRepLevelUp(vote.userId);
      }
      for (const vote of losers) {
        txns.push(
          prisma.pointTransaction.create({
            data: { userId: vote.userId, amount: 0, type: "vote_loss", description: `Lost ${outcome === "YES" ? "NO" : "YES"} vote — "${post.title.slice(0, 50)}"`, postId },
          })
        );
      }
    }

    txns.push(
      prisma.post.update({
        where: { id: postId },
        data: { resolvedAt: new Date(), resolvedOutcome: outcome, resolutionNote: resolutionNote || null },
      })
    );

    await prisma.$transaction(txns);
    return NextResponse.json({ success: true, outcome, winnersCount: winners.length, pool });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Resolution failed" }, { status: 500 });
  }
}
