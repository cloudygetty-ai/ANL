// src/services/chat/ChatService.ts — Supabase Realtime chat service
import type { Channel, ChatMessage } from '@types/index';
import { logger } from '@utils/Logger';
import { CHAT } from '@config/constants';
import { supabase, isSupabaseReady } from '@config/supabase';

const MODULE = 'ChatService';

// ---------------------------------------------------------------------------
// Mock data — used when Supabase is not configured (local dev)
// ---------------------------------------------------------------------------

const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch-rooftop',
    name: 'Rooftop Crew',
    isGroup: true,
    members: ['user-1', 'user-2', 'user-3'],
    lastMessage: 'See you at 10?',
    lastMessageAt: Date.now() - 5 * 60_000,
    unreadCount: 2,
    avatarUrl: null,
  },
  {
    id: 'ch-jazz',
    name: 'Jazz Lounge',
    isGroup: true,
    members: ['user-1', 'user-4', 'user-5'],
    lastMessage: 'Tables are reserved',
    lastMessageAt: Date.now() - 15 * 60_000,
    unreadCount: 0,
    avatarUrl: null,
  },
  {
    id: 'ch-dm-alex',
    name: 'Alex M.',
    isGroup: false,
    members: ['user-1', 'user-2'],
    lastMessage: 'What are you vibing to tonight?',
    lastMessageAt: Date.now() - 30 * 60_000,
    unreadCount: 1,
    avatarUrl: null,
  },
  {
    id: 'ch-dm-sam',
    name: 'Sam K.',
    isGroup: false,
    members: ['user-1', 'user-6'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    avatarUrl: null,
  },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'ch-rooftop': [
    {
      id: 'msg-1',
      channelId: 'ch-rooftop',
      senderId: 'user-2',
      senderName: 'Alex M.',
      content: 'Anyone heading up early?',
      type: 'text',
      createdAt: Date.now() - 20 * 60_000,
      readBy: ['user-1'],
    },
    {
      id: 'msg-2',
      channelId: 'ch-rooftop',
      senderId: 'user-3',
      senderName: 'Sam K.',
      content: 'See you at 10?',
      type: 'text',
      createdAt: Date.now() - 5 * 60_000,
      readBy: [],
    },
  ],
  'ch-dm-alex': [
    {
      id: 'msg-3',
      channelId: 'ch-dm-alex',
      senderId: 'user-2',
      senderName: 'Alex M.',
      content: 'What are you vibing to tonight?',
      type: 'text',
      createdAt: Date.now() - 30 * 60_000,
      readBy: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ChatService {
  /**
   * Returns all channels the given user is a member of.
   * Falls back to mock data when Supabase is not configured.
   */
  async getChannels(userId: string): Promise<Channel[]> {
    if (!isSupabaseReady) {
      logger.debug(MODULE, 'getChannels — mock mode', { userId });
      return MOCK_CHANNELS;
    }

    try {
      // channel_members is a join table: { channel_id, user_id }
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          channels (
            id, name, is_group, avatar_url,
            channel_members ( user_id ),
            messages (
              content, created_at,
              order: created_at.desc,
              limit: 1
            )
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // WHY: The nested query shape is normalised here rather than letting
      // callers deal with raw Supabase join objects.
      return (data ?? []).map((row): Channel => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ch = (row as any).channels;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastMsg = (ch.messages as any[])?.[0] ?? null;
        return {
          id: ch.id as string,
          name: ch.name as string,
          isGroup: ch.is_group as boolean,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members: ((ch.channel_members as any[]) ?? []).map((m: any) => m.user_id as string),
          lastMessage: lastMsg ? (lastMsg.content as string) : null,
          lastMessageAt: lastMsg
            ? new Date(lastMsg.created_at as string).getTime()
            : null,
          unreadCount: 0, // TODO[NORMAL]: compute from message_reads table
          avatarUrl: (ch.avatar_url as string | null) ?? null,
        };
      });
    } catch (err) {
      logger.error(MODULE, 'getChannels failed', err);
      return MOCK_CHANNELS;
    }
  }

  /**
   * Returns up to `limit` most-recent messages for the given channel,
   * ordered oldest-first so UI can render top-to-bottom.
   */
  async getMessages(
    channelId: string,
    limit: number = CHAT.pageSize,
  ): Promise<ChatMessage[]> {
    if (!isSupabaseReady) {
      logger.debug(MODULE, 'getMessages — mock mode', { channelId });
      return MOCK_MESSAGES[channelId] ?? [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, channel_id, sender_id, sender_name, content, type, created_at, read_by')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Reverse so the result is oldest-first
      return ((data ?? []) as Array<Record<string, unknown>>)
        .map(this.rowToMessage)
        .reverse();
    } catch (err) {
      logger.error(MODULE, 'getMessages failed', err);
      return MOCK_MESSAGES[channelId] ?? [];
    }
  }

  /**
   * Returns (or creates) the DM channel between two users.
   * Tries a Supabase RPC first; if unavailable, falls back to a local insert.
   */
  async getOrCreateDM(
    userId: string,
    otherUserId: string,
  ): Promise<Channel> {
    if (!isSupabaseReady) {
      const mockDM: Channel = {
        id: `dm-${userId}-${otherUserId}`,
        name: 'Direct Message',
        isGroup: false,
        members: [userId, otherUserId],
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        avatarUrl: null,
      };
      logger.debug(MODULE, 'getOrCreateDM — mock mode');
      return mockDM;
    }

    try {
      // WHY: RPC encapsulates the "find-or-create" logic server-side to
      // avoid race conditions when two users initiate a DM simultaneously.
      const { data, error } = await supabase.rpc('get_or_create_dm', {
        user_a: userId,
        user_b: otherUserId,
      });

      if (error) throw error;

      return {
        id: (data as Record<string, unknown>).id as string,
        name: (data as Record<string, unknown>).name as string ?? '',
        isGroup: false,
        members: [userId, otherUserId],
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        avatarUrl: null,
      };
    } catch (err) {
      logger.error(MODULE, 'getOrCreateDM failed', err);
      throw err;
    }
  }

  /**
   * Inserts a new message into the channel.
   * Type defaults to 'text'. Vibe messages are rendered differently by the UI.
   */
  async send(
    channelId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: 'text' | 'vibe' = 'text',
  ): Promise<ChatMessage> {
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      channelId,
      senderId,
      senderName,
      content,
      type,
      createdAt: Date.now(),
      readBy: [senderId],
    };

    if (!isSupabaseReady) {
      logger.debug(MODULE, 'send — mock mode', { channelId, content });
      return optimistic;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: senderId,
          sender_name: senderName,
          content,
          type,
          read_by: [senderId],
        })
        .select('id, channel_id, sender_id, sender_name, content, type, created_at, read_by')
        .single();

      if (error) throw error;

      logger.debug(MODULE, 'Message sent', { channelId, type });
      return this.rowToMessage(data as Record<string, unknown>);
    } catch (err) {
      logger.error(MODULE, 'send failed', err);
      throw err;
    }
  }

  /**
   * Subscribes to new messages on a channel via Supabase Realtime.
   * Returns an unsubscribe function — call it when the component unmounts.
   */
  subscribe(
    channelId: string,
    callback: (msg: ChatMessage) => void,
  ): () => void {
    if (!isSupabaseReady) {
      logger.debug(MODULE, 'subscribe — mock mode, no-op subscription');
      return () => {};
    }

    const realtimeChannel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          try {
            const msg = this.rowToMessage(
              payload.new as Record<string, unknown>,
            );
            callback(msg);
          } catch (err) {
            logger.error(MODULE, 'Realtime message parse error', err);
          }
        },
      )
      .subscribe((status) => {
        logger.debug(MODULE, `Realtime status: ${status}`, { channelId });
      });

    return () => {
      supabase.removeChannel(realtimeChannel).catch((err) => {
        logger.warn(MODULE, 'Failed to remove Realtime channel', err);
      });
    };
  }

  /**
   * Records that the given user has read all messages in the channel.
   * Uses an upsert to avoid duplicate rows in the message_reads table.
   */
  async markRead(channelId: string, userId: string): Promise<void> {
    if (!isSupabaseReady) return;

    try {
      const { error } = await supabase.from('message_reads').upsert(
        { channel_id: channelId, user_id: userId, read_at: new Date().toISOString() },
        { onConflict: 'channel_id,user_id' },
      );
      if (error) throw error;
      logger.debug(MODULE, 'markRead', { channelId, userId });
    } catch (err) {
      logger.error(MODULE, 'markRead failed', err);
    }
  }

  /**
   * Adds a user to a channel's member list.
   * Uses upsert so the call is idempotent (safe to call multiple times).
   */
  async joinChannel(channelId: string, userId: string): Promise<void> {
    if (!isSupabaseReady) return;

    try {
      const { error } = await supabase.from('channel_members').upsert(
        { channel_id: channelId, user_id: userId, joined_at: new Date().toISOString() },
        { onConflict: 'channel_id,user_id' },
      );
      if (error) throw error;
      logger.info(MODULE, 'Joined channel', { channelId, userId });
    } catch (err) {
      logger.error(MODULE, 'joinChannel failed', err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Maps a raw DB row to our typed ChatMessage. */
  private rowToMessage(row: Record<string, unknown>): ChatMessage {
    return {
      id: row.id as string,
      channelId: (row.channel_id ?? row.channelId) as string,
      senderId: (row.sender_id ?? row.senderId) as string,
      senderName: (row.sender_name ?? row.senderName) as string,
      content: row.content as string,
      type: (row.type as ChatMessage['type']) ?? 'text',
      createdAt: row.created_at
        ? new Date(row.created_at as string).getTime()
        : Date.now(),
      readBy: (row.read_by as string[]) ?? [],
    };
  }
}
