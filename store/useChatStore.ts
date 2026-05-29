import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PendingPrompt {
  text: string;
  articleId?: string;
  articleUrl?: string;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface RateLimitState {
  /** Unix ms timestamp when the limit resets. null = not limited. */
  resetAt: number | null;
}

interface ChatStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

  pendingPrompt: PendingPrompt | null;
  setPendingPrompt: (prompt: PendingPrompt) => void;
  consumePendingPrompt: () => PendingPrompt | null;

  conversationId: string | null;
  setConversationId: (id: string | null) => void;

  anonymousHistory: PersistedMessage[];
  setAnonymousHistory: (messages: PersistedMessage[]) => void;
  clearAnonymousHistory: () => void;

  /** True while a request is in flight (submitted or streaming). */
  isBusy: boolean;
  setIsBusy: (busy: boolean) => void;

  rateLimit: RateLimitState;
  setRateLimit: (rl: RateLimitState) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      pendingPrompt: null,
      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
      consumePendingPrompt: () => {
        const prompt = get().pendingPrompt;
        if (prompt) set({ pendingPrompt: null });
        return prompt;
      },

      conversationId: null,
      setConversationId: (id) => set({ conversationId: id }),

      anonymousHistory: [],
      setAnonymousHistory: (messages) => set({ anonymousHistory: messages }),
      clearAnonymousHistory: () => set({ anonymousHistory: [] }),

      isBusy: false,
      setIsBusy: (busy) => set({ isBusy: busy }),

      rateLimit: { resetAt: null },
      setRateLimit: (rl) => set({ rateLimit: rl }),
    }),
    {
      name: "healthspan-chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        anonymousHistory: state.anonymousHistory,
      }),
    }
  )
);
