// src/screens/ChatScreen.tsx
// Two-mode screen: when no channel is active it shows the channel list with
// unread badges; when a channel is selected it shows the message thread with
// a text input at the bottom. Uses ChatService for all network calls and
// useChatStore for local state.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useChatStore } from '@services/state/chatStore';
import { useUserStore } from '@services/state/userStore';
import { ChatService } from '@services/chat';
import { COLORS, CHAT } from '@config/constants';
import type { Channel, ChatMessage } from '@types/index';

// ---------------------------------------------------------------------------
// Module-level service instance — created once so subscriptions survive
// re-renders.
// ---------------------------------------------------------------------------
const chatService = new ChatService();

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Returns a human-readable time string for a message timestamp. */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${period}`;
}

/** Returns "x min ago", "x hr ago", or a date string for channel previews. */
function formatRelative(ts: number | null): string {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single channel row in the channel list view. */
function ChannelRow({
  channel,
  onPress,
}: {
  channel: Channel;
  onPress: () => void;
}) {
  const initial = channel.name.charAt(0).toUpperCase();
  const hasUnread = channel.unreadCount > 0;

  return (
    <TouchableOpacity style={styles.channelRow} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar circle with initial */}
      <View style={styles.channelAvatar}>
        <Text style={styles.channelInitial}>{initial}</Text>
        {!channel.isGroup && (
          // Online presence dot — shown only for DMs
          <View style={styles.presenceDot} />
        )}
      </View>

      {/* Name and last message preview */}
      <View style={styles.channelBody}>
        <View style={styles.channelTop}>
          <Text
            style={[styles.channelName, hasUnread && styles.channelNameBold]}
            numberOfLines={1}
          >
            {channel.name}
          </Text>
          <Text style={styles.channelTime}>
            {formatRelative(channel.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.channelBottom}>
          <Text style={styles.channelPreview} numberOfLines={1}>
            {channel.lastMessage ?? 'No messages yet'}
          </Text>

          {/* Unread badge */}
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Single message bubble in the conversation view. */
function MessageBubble({
  message,
  isSelf,
}: {
  message: ChatMessage;
  isSelf: boolean;
}) {
  return (
    <View style={[styles.bubbleRow, isSelf && styles.bubbleRowSelf]}>
      {/* Sender label — only for group chat messages from others */}
      {!isSelf && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}

      <View
        style={[
          styles.bubble,
          isSelf ? styles.bubbleSelf : styles.bubbleOther,
        ]}
      >
        <Text style={[styles.bubbleText, isSelf && styles.bubbleTextSelf]}>
          {message.content}
        </Text>
      </View>

      <Text style={[styles.bubbleTime, isSelf && styles.bubbleTimeSelf]}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}

/** Header bar shown at the top of the conversation view. */
function ConversationHeader({
  channel,
  onBack,
}: {
  channel: Channel;
  onBack: () => void;
}) {
  return (
    <View style={styles.convHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={styles.convHeaderCenter}>
        <Text style={styles.convHeaderName} numberOfLines={1}>
          {channel.name}
        </Text>
        {channel.isGroup && (
          <Text style={styles.convHeaderSub}>
            {channel.members.length} members
          </Text>
        )}
      </View>

      {/* Placeholder for future video-call button */}
      <View style={styles.convHeaderRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ChatScreen: React.FC = () => {
  const {
    channels,
    messages,
    activeChannelId,
    setChannels,
    setActiveChannel,
    addMessage,
    setMessages,
    markChannelRead,
  } = useChatStore();

  const profile = useUserStore((s) => s.profile);

  // Local text input state — not stored globally since it's transient UI state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Keep an unsubscribe reference so we can clean up on channel change
  const unsubRef = useRef<(() => void) | null>(null);

  // ---------------------------------------------------------------------------
  // Load channels on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadChannels() {
      try {
        const fetched = await chatService.getChannels(profile?.id ?? 'anonymous');
        setChannels(fetched);
      } catch {
        // ChatService returns mock data on error — store will still populate
      }
    }
    loadChannels();
  }, [profile?.id, setChannels]);

  // ---------------------------------------------------------------------------
  // When active channel changes: load messages + subscribe to realtime
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Tear down any previous subscription first
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!activeChannelId) return;

    // Mark as read immediately
    markChannelRead(activeChannelId);

    async function loadMessages() {
      try {
        const msgs = await chatService.getMessages(activeChannelId!);
        setMessages(activeChannelId!, msgs);
      } catch {
        // Silently handled — mock data from ChatService fills the gap
      }
    }

    loadMessages();

    // Subscribe to incoming realtime messages
    unsubRef.current = chatService.subscribe(activeChannelId, (msg) => {
      addMessage(activeChannelId!, msg);
    });

    // Scroll to bottom when new messages arrive
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [activeChannelId, addMessage, markChannelRead, setMessages]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Scroll to bottom whenever the message list for the active channel grows
  // ---------------------------------------------------------------------------
  const channelMessages = activeChannelId ? (messages[activeChannelId] ?? []) : [];
  useEffect(() => {
    if (channelMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [channelMessages.length]);

  // ---------------------------------------------------------------------------
  // Send a message
  // ---------------------------------------------------------------------------
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !activeChannelId || isSending || !profile) return;

    // Validate against max length before sending
    if (text.length > CHAT.maxMessageLength) return;

    setInputText('');
    setIsSending(true);

    try {
      const msg = await chatService.send(
        activeChannelId,
        profile.id,
        profile.displayName,
        text,
      );
      // Optimistically add the message — realtime may also deliver it,
      // but ChatService uses a local-prefixed ID so duplicates are rare.
      addMessage(activeChannelId, msg);
    } catch {
      // TODO[NORMAL]: surface a toast/snack bar on send failure
      setInputText(text); // Restore text so the user can retry
    } finally {
      setIsSending(false);
    }
  }, [inputText, activeChannelId, isSending, profile, addMessage]);

  // ---------------------------------------------------------------------------
  // Render — channel list (no active channel) or conversation
  // ---------------------------------------------------------------------------

  const activeChannel = channels.find((ch) => ch.id === activeChannelId) ?? null;

  if (!activeChannel) {
    // ---- Channel list view ----
    return (
      <View style={styles.root}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Messages</Text>
          <Text style={styles.listSub}>{channels.length} conversations</Text>
        </View>

        <FlatList
          data={channels}
          keyExtractor={(ch) => ch.id}
          contentContainerStyle={styles.channelList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No conversations yet.</Text>
          }
          renderItem={({ item }) => (
            <ChannelRow
              channel={item}
              onPress={() => setActiveChannel(item.id)}
            />
          )}
        />
      </View>
    );
  }

  // ---- Conversation view ----
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ConversationHeader
        channel={activeChannel}
        onBack={() => setActiveChannel(null)}
      />

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={channelMessages}
        keyExtractor={(msg) => msg.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Be the first to say something.</Text>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isSelf={item.senderId === profile?.id}
          />
        )}
      />

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Say something..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={CHAT.maxMessageLength}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!inputText.trim() || isSending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // --- Channel list ---
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  listSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  channelList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 76,
  },

  // --- Channel row ---
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInitial: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  channelBody: { flex: 1, gap: 4 },
  channelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  channelNameBold: {
    fontWeight: '700',
  },
  channelTime: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  channelBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelPreview: {
    color: COLORS.textMuted,
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '800',
  },

  // --- Conversation header ---
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: COLORS.accent,
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
  convHeaderCenter: { flex: 1 },
  convHeaderName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  convHeaderSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  convHeaderRight: { width: 36 },

  // --- Message list ---
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    flexGrow: 1,
  },

  // --- Message bubble ---
  bubbleRow: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    gap: 3,
  },
  bubbleRowSelf: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: '#1a1a24',
    borderBottomLeftRadius: 4,
  },
  bubbleSelf: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextSelf: {
    color: COLORS.bg,
  },
  bubbleTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginLeft: 4,
  },
  bubbleTimeSelf: {
    marginLeft: 0,
    marginRight: 4,
  },

  // --- Input row ---
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 21,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow effect for the send button
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.card,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },
});

export default ChatScreen;
