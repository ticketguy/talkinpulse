"use client";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "bittercup2026";

interface AdminUser { id: string; username: string; displayName: string; repScore: number; repLevel: string; talkinPoints: number; adminRole: string | null; _count: { votes: number; posts: number; comments: number } }
interface OpenMarket { id: string; title: string; type: string; yesCount: number; noCount: number; pointsPool: number; endsAt: string | null; resolvedAt: string | null }
interface Settings { signupPoints: number; commentPoints: number; voteNeutralPts: number; weeklyRewardAmt: number }

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<"markets" | "points" | "users" | "settings">("markets");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [markets, setMarkets] = useState<OpenMarket[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const isOwner = user?.username === "0xticketguy";
  const canAccess = user?.isAdmin || user?.adminRole;

  useEffect(() => {
    if (authed && canAccess) {
      fetchAll();
    }
  }, [authed, canAccess]);

  const fetchAll = async () => {
    setLoading(true);
    const [u, p, s] = await Promise.all([
      fetch("/api/admin/users").then(r => r.json()),
      fetch("/api/posts?filter=markets").then(r => r.json()),
      fetch("/api/admin/settings").then(r => r.json()),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setMarkets(Array.isArray(p?.posts) ? p.posts.filter((x: any) => !x.resolvedAt) : []);
    setSettings(s);
    setLoading(false);
  };

  const handlePw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else { setPwError(true); }
  };

  const resolveMarket = async (postId: string, outcome: string, note: string) => {
    setLoading(true);
    const res = await fetch("/api/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, outcome, resolutionNote: note }) });
    const d = await res.json();
    setMsg(d.success ? `Resolved! ${d.winnersCount} winners shared ${d.pool} points.` : d.error);
    await fetchAll();
    setLoading(false);
  };

  const distributePoints = async (type: string, amount: number, desc: string, userIds?: string[]) => {
    const res = await fetch("/api/admin/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, amount, description: desc, userIds }) });
    const d = await res.json();
    setMsg(d.success ? `Done! Affected ${d.affected} users.` : d.error);
    await fetchAll();
  };

  const updateSettings = async (data: Partial<Settings>) => {
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { setMsg("Settings saved."); await fetchAll(); }
  };

  const grantRole = async (userId: string, role: string) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, adminRole: role || null }) });
    setMsg("Role updated.");
    await fetchAll();
  };

  const S = {
    bg: "#0a0a0a", surface: "#111", border: "rgba(255,255,255,0.08)",
    text: "#f0f0f0", muted: "#555", accent: "#e01c1c",
    green: "#34d399", yellow: "#f59e0b",
  };

  const card = { background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 };
  const btn = (color = S.accent) => ({ padding: "7px 16px", borderRadius: 8, background: color, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const input = { padding: "8px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "#0d0d0d", color: S.text, fontSize: 13, fontFamily: "inherit", outline: "none" };

  if (status === "loading") return <div style={{ minHeight: "100vh", background: S.bg, color: S.text, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>;

  if (!session) return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, color: S.muted, marginBottom: 16 }}>Sign in to access admin</div>
        <button onClick={() => signIn("twitter")} style={btn()}>Connect X</button>
      </div>
    </div>
  );

  if (!canAccess) return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: S.accent }}>Access Denied</div>
        <div style={{ fontSize: 13, color: S.muted }}>@{user?.username} is not authorized.</div>
      </div>
    </div>
  );

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ ...card, width: 320, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Bitter<span style={{ color: S.accent }}>Cup</span></div>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 20 }}>Admin Panel</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePw()} placeholder="Enter password" style={{ ...input, width: "100%", marginBottom: 10 }} />
        {pwError && <div style={{ fontSize: 11, color: S.accent, marginBottom: 8 }}>Wrong password</div>}
        <button onClick={handlePw} style={{ ...btn(), width: "100%" }}>Enter</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Syne',sans-serif" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0} input,select,textarea{background:#0d0d0d;color:#f0f0f0;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;font-family:inherit;font-size:13px;outline:none;width:100%}`}</style>

      {/* Header */}
      <header style={{ background: "#0d0d0d", borderBottom: `1px solid ${S.border}`, padding: "0 24px", display: "flex", alignItems: "center", height: 54, gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Bitter<span style={{ color: S.accent }}>Cup</span></div>
        <span style={{ fontSize: 11, color: S.muted }}>Admin Panel</span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: S.muted }}>@{user?.username} · {user?.adminRole || "admin"}</div>
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
        {msg && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: S.green, fontSize: 12, marginBottom: 16 }} onClick={() => setMsg("")}>{msg} ✕</div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {(["markets", "points", "users", "settings"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...btn(tab === t ? S.accent : "transparent"), border: `1px solid ${tab === t ? S.accent : S.border}`, color: tab === t ? "#fff" : S.muted, textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>

        {/* MARKETS TAB */}
        {tab === "markets" && (
          <div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 14 }}>Resolve open markets. Set outcome and write a plain-English explanation for the Signals page.</div>
            {loading ? <div style={{ color: S.muted, fontSize: 13 }}>Loading…</div> : markets.length === 0 ? <div style={{ color: S.muted, fontSize: 13 }}>No open markets.</div> : markets.map(m => (
              <MarketCard key={m.id} market={m} onResolve={resolveMarket} S={S} card={card} btn={btn} input={input} />
            ))}
          </div>
        )}

        {/* POINTS TAB */}
        {tab === "points" && (
          <div>
            <PointsPanel onDistribute={distributePoints} users={users} S={S} card={card} btn={btn} input={input} settings={settings} />
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 14 }}>Manage roles. You cannot see user personal data.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>@{u.username}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{u.repLevel.replace(/_/g, " ")} · {u.repScore} REP · {u.talkinPoints} TP · {u._count.votes} votes</div>
                  </div>
                  {isOwner && (
                    <select defaultValue={u.adminRole || ""} onChange={e => grantRole(u.id, e.target.value)} style={{ width: 160, padding: "5px 10px" }}>
                      <option value="">No role</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="POINTS_MANAGER">Points Manager</option>
                      <option value="READ_ONLY">Read Only</option>
                      {isOwner && <option value="SUPER_ADMIN">Super Admin</option>}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && settings && (
          <SettingsPanel settings={settings} onSave={updateSettings} S={S} card={card} btn={btn} />
        )}
      </div>
    </div>
  );
}

function MarketCard({ market, onResolve, S, card, btn, input }: any) {
  const [outcome, setOutcome] = useState("NEUTRAL");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{market.title}</div>
        <div style={{ fontSize: 11, color: S.muted, flexShrink: 0 }}>{market.pointsPool} pts pool</div>
      </div>
      <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>YES {market.yesCount} · NO {market.noCount} · {market.endsAt ? `ends ${new Date(market.endsAt).toLocaleDateString()}` : "no end date"}</div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={btn()}>Resolve Market</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select value={outcome} onChange={e => setOutcome(e.target.value)} style={{ padding: "8px 12px" }}>
            <option value="YES">YES wins</option>
            <option value="NO">NO wins</option>
            <option value="NEUTRAL">Neutral — everyone gets points back</option>
          </select>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Plain-English explanation for Signals page (e.g. 'The protocol launched as promised, YES voters were right.')" rows={2} style={{ padding: "8px 12px", resize: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onResolve(market.id, outcome, note)} style={btn()}>Confirm Resolution</button>
            <button onClick={() => setOpen(false)} style={{ ...btn("transparent"), border: `1px solid ${S.border}`, color: S.muted }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PointsPanel({ onDistribute, users, S, card, btn, input, settings }: any) {
  const [wamt, setWamt] = useState(settings?.weeklyRewardAmt || 50);
  const [wdesc, setWdesc] = useState("Weekly reward");
  const [mamt, setMamt] = useState(50);
  const [mdesc, setMdesc] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  return (
    <div>
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Weekly Reward Distribution</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input type="number" value={wamt} onChange={e => setWamt(+e.target.value)} style={{ width: 100 }} />
          <input value={wdesc} onChange={e => setWdesc(e.target.value)} style={{ flex: 1 }} placeholder="Description" />
        </div>
        <button onClick={() => onDistribute("weekly_reward", wamt, wdesc)} style={btn()}>Distribute to All Users ({users.length})</button>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Manual Points — Select Users</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input type="number" value={mamt} onChange={e => setMamt(+e.target.value)} style={{ width: 100 }} />
          <input value={mdesc} onChange={e => setMdesc(e.target.value)} style={{ flex: 1 }} placeholder="Reason" />
        </div>
        <div style={{ display: "grid", gap: 5, maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
          {users.map((u: any) => (
            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, background: selectedUsers.includes(u.id) ? "rgba(224,28,28,0.1)" : "transparent", cursor: "pointer" }}>
              <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={e => setSelectedUsers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))} style={{ width: "auto" }} />
              <span style={{ fontSize: 12 }}>@{u.username} · {u.talkinPoints} TP</span>
            </label>
          ))}
        </div>
        <button onClick={() => selectedUsers.length && onDistribute("manual", mamt, mdesc, selectedUsers)} style={btn()} disabled={!selectedUsers.length}>
          Send to {selectedUsers.length} selected
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSave, S, card, btn }: any) {
  const [form, setForm] = useState(settings);
  return (
    <div style={{ ...card, maxWidth: 480 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Platform Settings</div>
      {[
        { key: "signupPoints", label: "Signup bonus (Talkin Points)" },
        { key: "commentPoints", label: "Points per comment" },
        { key: "voteNeutralPts", label: "Neutral vote participation bonus" },
        { key: "weeklyRewardAmt", label: "Default weekly reward amount" },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</div>
          <input type="number" value={form[f.key]} onChange={e => setForm((p: any) => ({ ...p, [f.key]: +e.target.value }))} style={{ maxWidth: 120 }} />
        </div>
      ))}
      <button onClick={() => onSave(form)} style={btn()}>Save Settings</button>
    </div>
  );
}
