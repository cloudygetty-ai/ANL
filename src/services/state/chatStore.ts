// src/services/state/chatStore.ts
import { create } from 'zustand';
import type { Channel, ChatMessage } from '@types/index';

interface ChatStore {
  channels: Channel[];
  // WHY: keyed by channelId so lookups are O(1) and we never re-fetch
  // an entire array to insert one message
  messages: Record<string, ChatMessage[]>;
  activeChannelId: string | null;

  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (id: string | null) => void;
  addMessage: (channelId: string, message: ChatMessage) => void;
  setMessages: (channelId: string, messages: ChatMessage[]) => void;
  markChannelRead: (channelId: string) => void;
  getUnreadTotal: () => number;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  channels: [],
  messages: {},
  activeChannelId: null,

  setChannels: (channels) => set({ channels }),

  setActiveChannel: (activeChannelId) => set({ activeChannelId }),

  // Append a single message without replacing the whole channel array
  addMessage: (channelId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: [...(s.messages[channelId] ?? []), message],
      },
    })),

  // Full replacement used on initial channel load / pagination
  setMessages: (channelId, messages) =>
    set((s) => ({
      messages: { ...s.messages, [channelId]: messages },
    })),

  markChannelRead: (channelId) =>
    set((s) => ({
      channels: s.channels.map((ch) =>
        ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
      ),
    })),

  getUnreadTotal: () =>
    get().channels.reduce((sum, ch) => sum + ch.unreadCount, 0),
}));
