import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Post, FeedFilter, Theme } from "@/types";

interface AppStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;

  votes: Record<string, "yes" | "no">;
  setVote: (postId: string, side: "yes" | "no") => void;

  activeTab: "feed" | "signals" | "profile";
  setActiveTab: (t: "feed" | "signals" | "profile") => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      feedFilter: "markets",
      setFeedFilter: (feedFilter) => set({ feedFilter }),

      votes: {},
      setVote: (postId, side) =>
        set((s) => ({ votes: { ...s.votes, [postId]: side } })),

      activeTab: "feed",
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    { name: "talkinpulse-store", partialize: (s) => ({ theme: s.theme, votes: s.votes }) }
  )
);
