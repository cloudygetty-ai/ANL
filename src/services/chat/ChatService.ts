/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/services/chat/ChatService.ts
// Stack: Supabase Realtime — Postgres + WebSocket subscriptions
// Supports: DM threads, event group chats, venue rooms, neighborhood channels
import type { Channel, ChatMessage } from '@types/index';

// Lazy Supabase import — won't break TS compile without native deps
let supabase: any = null;
const getSupabase = () => {
  if (supabase) return supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    );
  } catch { /* not installed yet */ }
  return supabase;
};

// ── In-memory state for offline/dev mode ──────────────────────────────────────
const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch-rooftop',
    type: 'event',
    name: 'Late Night Rooftop 🎉',
    memberCount: 34,
    unreadCount: 7,
    members: ['u1','u2','u3'],
    createdAt: Date.now() - 3600000,
    eventId: 'e1',
  },
  {
    id: 'ch-barnight',
    type: 'event',
    name: 'Bar Night 🍸',
    memberCount: 18,
    unreadCount: 2,
    members: ['u4','u5'],
    createdAt: Date.now() - 7200000,
    eventId: 'e2',
  },
  {
    id: 'ch-les',
    type: 'neighborhood',
    name: '📍 Lower East Side',
    memberCount: 47,
    unreadCount: 0,
    members: [],
    createdAt: Date.now() - 86400000,
  },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'ch-rooftop': [
    { id:'m1', channelId:'ch-rooftop', senderId:'u2', senderName:'Mia',  content:'anyone on the roof yet? 🔥', type:'text', readBy:[], createdAt: Date.now()-600000 },
    { id:'m2', channelId:'ch-rooftop', senderId:'u3', senderName:'Dre',  content:'heading up now', type:'text', readBy:[], createdAt: Date.now()-300000 },
    { id:'m3', channelId:'ch-rooftop', senderId:'u4', senderName:'Luna', content:'omw 🦋', type:'text', readBy:[], createdAt: Date.now()-60000 },
  ],
  'ch-barnight': [
    { id:'m4', channelId:'ch-barnight', senderId:'u5', senderName:'Jade', content:'back bar is packed', type:'text', readBy:[], createdAt: Date.now()-900000 },
  ],
};

type MessageHandler = (msg: ChatMessage) => void;
const subscribers: Record<string, MessageHandler[]> = {};

export class ChatService {
  private userId: string;
  private realtimeChannel: any = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Fetch all channels the current user is in */
  async getChannels(): Promise<Channel[]> {
    const sb = getSupabase();
    if (!sb) return MOCK_CHANNELS;

    const { data, error } = await sb
      .from('channels')
      .select('*, messages(content, created_at, sender_id)')
      .contains('member_ids', [this.userId])
      .order('updated_at', { ascending: false });

    if (error) { console.warn('[ChatService] getChannels:', error); return MOCK_CHANNELS; }
    return data ?? MOCK_CHANNELS;
  }

  /** Fetch message history for a channel */
  async getMessages(channelId: string, limit = 50): Promise<ChatMessage[]> {
    const sb = getSupabase();
    if (!sb) return MOCK_MESSAGES[channelId] ?? [];

    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) { console.warn('[ChatService] getMessages:', error); return MOCK_MESSAGES[channelId] ?? []; }
    return (data ?? []).reverse();
  }

  /** Create or fetch a DM channel between two users */
  async getOrCreateDM(otherUserId: string): Promise<Channel> {
    const sb = getSupabase();
    const dmId = [this.userId, otherUserId].sort().join(':');
    if (!sb) {
      return {
        id: `dm-${dmId}`,
        type: 'dm',
        name: 'Direct Message',
        memberCount: 2,
        unreadCount: 0,
        members: [this.userId, otherUserId],
        createdAt: Date.now(),
      };
    }

    const { data: existing } = await sb
      .from('channels')
      .select('*')
      .eq('dm_id', dmId)
      .single();

    if (existing) return existing;

    const { data: created } = await sb
      .from('channels')
      .insert({ type: 'dm', dm_id: dmId, member_ids: [this.userId, otherUserId] })
      .select()
      .single();

    return created;
  }

  /** Send a message */
  async send(channelId: string, content: string, type: ChatMessage['type'] = 'text'): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      channelId,
      senderId:    this.userId,
      senderName:  'You',
      content,
      type,
      readBy:      [this.userId],
      createdAt:   Date.now(),
    };

    const sb = getSupabase();
    if (sb) {
      await sb.from('messages').insert({
        id:         msg.id,
        channel_id: channelId,
        sender_id:  this.userId,
        content,
        type,
      });
    } else {
      // Mock: push locally and notify subscribers
      if (!MOCK_MESSAGES[channelId]) MOCK_MESSAGES[channelId] = [];
      MOCK_MESSAGES[channelId].push(msg);
      (subscribers[channelId] ?? []).forEach(fn => fn(msg));
    }

    return msg;
  }

  /** Subscribe to new messages in a channel */
  subscribe(channelId: string, onMessage: MessageHandler): () => void {
    const sb = getSupabase();

    if (sb) {
      this.realtimeChannel = sb
        .channel(`messages:${channelId}`)
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `channel_id=eq.${channelId}`,
        }, (payload: any) => {
          onMessage(payload.new as ChatMessage);
        })
        .subscribe();

      return () => { sb.removeChannel(this.realtimeChannel); };
    }

    // Mock subscription
    if (!subscribers[channelId]) subscribers[channelId] = [];
    subscribers[channelId].push(onMessage);
    return () => {
      subscribers[channelId] = subscribers[channelId].filter(fn => fn !== onMessage);
    };
  }

  /** Mark all messages in a channel as read */
  async markRead(channelId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('message_reads').upsert({ channel_id: channelId, user_id: this.userId, read_at: new Date().toISOString() });
  }

  /** Join a proximity-based group (event or neighborhood) */
  async joinChannel(channelId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    await sb.rpc('join_channel', { p_channel_id: channelId, p_user_id: this.userId });
  }
}
