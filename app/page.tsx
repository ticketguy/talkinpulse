"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Feed } from "@/components/feed/Feed";
import { useAppStore } from "@/store";
import { SignalsPage } from "./signals/SignalsPage";
import ProfilePage from "./profile/ProfilePage";

interface Stats {
  markets: number;
  takes: number;
  callers: number;
}

export default function Home() {
  const { theme, activeTab } = useAppStore();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<Stats>({ markets: 0, takes: 0, callers: 0 });

  useEffect(() => {
    document.body.style.background = isDark ? "#0a0a0a" : "#f8f8f8";
    document.body.style.color = isDark ? "#f0f0f0" : "#0a0a0a";
  }, [isDark]);

  // Fetch real stats
  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => setStats({ markets: d.markets, takes: d.takes, callers: d.callers }))
      .catch(() => {});

    // Refresh every 30s
    const interval = setInterval(() => {
      fetch("/api/stats")
        .then(r => r.json())
        .then(d => setStats({ markets: d.markets, takes: d.takes, callers: d.callers }))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const t = {
    bg: isDark ? "#0a0a0a" : "#f8f8f8",
    border: isDark ? "rgba(255,255,255,0.07)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#555" : "#999",
    surface: isDark ? "#141414" : "#ffffff",
    accent: "#e01c1c",
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background .2s, color .2s", fontFamily: "'Syne','Outfit',sans-serif" }}>
      <Header />

      {/* Hero strip */}
      <div style={{
        background: isDark
          ? "linear-gradient(135deg, #0a0a0a 0%, #160404 50%, #0a0a0a 100%)"
          : "linear-gradient(135deg, #fff 0%, #fff5f5 50%, #fff 100%)",
        borderBottom: `1px solid ${t.border}`,
        padding: "16px 20px 14px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
              CT {activeTab === "feed" ? "Feed" : activeTab === "signals" ? "Signals" : "Profile"}
            </h1>
            <p style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>
              {activeTab === "feed"
                ? "Markets · Takes · Convos · Events — generated from live CT"
                : activeTab === "signals"
                ? "Distilled narrative intelligence from crowd conviction"
                : "Your calls, takes, and CT reputation"}
            </p>
          </div>

          {/* Real stats — desktop only */}
          <div className="desktop-nav" style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Markets", val: formatCount(stats.markets), color: "#0ea5e9" },
              { label: "Takes", val: formatCount(stats.takes), color: "#8b5cf6" },
              { label: "Callers", val: formatCount(stats.callers), color: t.accent },
            ].map(s => (
              <div key={s.label} style={{ padding: "7px 14px", borderRadius: 10, background: t.surface, border: `1px solid ${t.border}`, textAlign: "center", minWidth: 72 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
                <div style={{ fontSize: 9, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 80px" }}>
        {activeTab === "feed" && <Feed />}
        {activeTab === "signals" && <SignalsPage />}
        {activeTab === "profile" && <ProfilePage />}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
