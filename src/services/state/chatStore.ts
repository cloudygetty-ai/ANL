// src/services/state/chatStore.ts
import { create } from 'zustand';
import type { Channel, ChatMessage } from '@types/index';

interface ChatStore {
  channels:       Channel[];
  messages:       Record<string, ChatMessage[]>;
  activeChannelId: string | null;
  setChannels:    (channels: Channel[]) => void;
  setMessages:    (channelId: string, messages: ChatMessage[]) => void;
  appendMessage:  (channelId: string, message: ChatMessage) => void;
  setActiveChannel: (id: string | null) => void;
  markRead:       (channelId: string) => void;
  totalUnread:    () => number;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  channels:        [],
  messages:        {},
  activeChannelId: null,

  setChannels: (channels) => set({ channels }),

  setMessages: (channelId, messages) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),

  appendMessage: (channelId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: [...(s.messages[channelId] ?? []), message],
      },
      channels: s.channels.map((ch) =>
        ch.id === channelId
          ? { ...ch, lastMessage: message, unreadCount: ch.id === s.activeChannelId ? 0 : ch.unreadCount + 1 }
          : ch
      ),
    })),

  setActiveChannel: (id) => set({ activeChannelId: id }),

  markRead: (channelId) =>
    set((s) => ({
      channels: s.channels.map((ch) =>
        ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
      ),
    })),

  totalUnread: () => get().channels.reduce((sum, ch) => sum + ch.unreadCount, 0),
}));
