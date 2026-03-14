/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/screens/ChatScreen.tsx
// Handles: DM threads, event group chats, neighborhood rooms
// Real-time via Supabase channel subscriptions (or mock in dev)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatService } from '@services/chat/ChatService';
import type { ChatMessage, Channel } from '@types/index';

const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#14141f',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  cyan:      '#22d3ee',
  green:     '#4ade80',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
  myBubble:  '#a855f7',
  theirBubble: '#14141f',
};

const CURRENT_USER_ID = 'me'; // Replace with auth context

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage; isMe: boolean; showName: boolean }> = ({
  msg, isMe, showName,
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(isMe ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideX, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  if (msg.type === 'system') {
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemMsgText}>{msg.content}</Text>
      </View>
    );
  }

  if (msg.type === 'vibe') {
    return (
      <Animated.View style={[styles.vibeBubble, { opacity: fadeIn }]}>
        <Text style={styles.vibeBubbleText}>✨ {msg.senderName} sent a vibe</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
        { opacity: fadeIn, transform: [{ translateX: slideX }] },
      ]}
    >
      {!isMe && showName && (
        <Text style={styles.bubbleName}>{msg.senderName}</Text>
      )}
      <View style={[
        styles.bubble,
        isMe ? [styles.bubbleMe, { backgroundColor: C.myBubble }]
              : styles.bubbleThem,
      ]}>
        <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{msg.content}</Text>
        <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.5)' }]}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots: React.FC = () => {
  const [dots] = useState([
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ]);

  useEffect(() => {
    dots.forEach((d, i) => {
      const loop = Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -4, duration: 300, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0,  duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ]));
      loop.start();
    });
  }, []);

  return (
    <View style={styles.typingWrap}>
      <View style={styles.typingBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
};

// ── Channel list item ─────────────────────────────────────────────────────────
const ChannelRow: React.FC<{ channel: Channel; onPress: () => void }> = ({ channel, onPress }) => {
  const typeIcon = channel.type === 'dm' ? '💬' : channel.type === 'event' ? '🎉' : channel.type === 'venue' ? '🍸' : '📍';
  return (
    <TouchableOpacity style={styles.channelRow} onPress={onPress}>
      <View style={styles.channelAvatar}>
        <Text style={{ fontSize: 20 }}>{typeIcon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.channelRowTop}>
          <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
          {channel.lastMessage && (
            <Text style={styles.channelTime}>
              {new Date(channel.lastMessage.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </Text>
          )}
        </View>
        <View style={styles.channelRowBottom}>
          <Text style={styles.channelPreview} numberOfLines={1}>
            {channel.lastMessage?.content ?? `${channel.memberCount} members`}
          </Text>
          {channel.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{channel.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Chat thread view ──────────────────────────────────────────────────────────
const ThreadView: React.FC<{
  channel: Channel;
  service: ChatService;
  onBack:  () => void;
  onVideo: () => void;
}> = ({ channel, service, onBack, onVideo }) => {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [isTyping,  _setIsTyping]  = useState(false);
  const [sending,   setSending]   = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    service.getMessages(channel.id).then(msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    });
    const unsub = service.subscribe(channel.id, (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    });
    service.markRead(channel.id);
    return unsub;
  }, [channel.id]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await service.send(channel.id, text);
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } finally {
      setSending(false);
    }
  }, [input, sending, channel.id]);

  const isGroup = channel.type !== 'dm';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Thread header */}
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.threadTitle} numberOfLines={1}>{channel.name}</Text>
          <Text style={styles.threadSub}>
            {channel.type === 'dm' ? 'Direct message' : `${channel.memberCount} people here now`}
          </Text>
        </View>
        {channel.type === 'dm' && (
          <TouchableOpacity style={styles.videoCallBtn} onPress={onVideo}>
            <Text style={{ fontSize: 18 }}>📹</Text>
          </TouchableOpacity>
        )}
        {isGroup && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Bubble
            msg={item}
            isMe={item.senderId === CURRENT_USER_ID}
            showName={isGroup && (index === 0 || messages[index-1]?.senderId !== item.senderId)}
          />
        )}
        ListFooterComponent={isTyping ? <TypingDots /> : null}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.vibeBtn} onPress={async () => {
          await service.send(channel.id, '', 'vibe');
        }}>
          <Text style={{ fontSize: 18 }}>✨</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="say something..."
          placeholderTextColor={C.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ── Main ChatScreen ───────────────────────────────────────────────────────────
const ChatScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const [channels,       setChannels]      = useState<Channel[]>([]);
  const [activeChannel,  setActiveChannel] = useState<Channel | null>(null);
  const [service]                          = useState(() => new ChatService(CURRENT_USER_ID));

  // Deep-link: open DM directly from map
  useEffect(() => {
    service.getChannels().then(setChannels);
    if (route?.params?.userId) {
      service.getOrCreateDM(route.params.userId).then(ch => {
        setActiveChannel(ch);
      });
    }
  }, [route?.params?.userId]);

  if (activeChannel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThreadView
          channel={activeChannel}
          service={service}
          onBack={() => setActiveChannel(null)}
          onVideo={() => navigation?.navigate('Video', {
            userId:   activeChannel.members.find(id => id !== CURRENT_USER_ID),
            userName: activeChannel.name,
          })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>CHATS</Text>
        <View style={styles.listTitleSub}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>REAL-TIME</Text>
        </View>
      </View>

      {/* Channel list */}
      <FlatList
        data={channels.length ? channels : require('@services/chat/ChatService').MOCK_CHANNELS ?? []}
        keyExtractor={ch => ch.id}
        renderItem={({ item }) => (
          <ChannelRow channel={item} onPress={() => setActiveChannel(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Channel list
  listHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:16 },
  listTitle:    { fontSize:24, fontWeight:'900', color:C.text, letterSpacing:2 },
  listTitleSub: { flexDirection:'row', alignItems:'center', gap:6 },
  channelRow:   { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14, gap:14 },
  channelAvatar:{ width:48, height:48, borderRadius:24, backgroundColor:C.surfaceUp, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
  channelRowTop:    { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  channelRowBottom: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  channelName:  { fontSize:14, fontWeight:'700', color:C.text, flex:1 },
  channelTime:  { fontSize:11, color:C.textMuted },
  channelPreview: { fontSize:12, color:C.textDim, flex:1 },
  unreadBadge:  { backgroundColor:C.purple, borderRadius:10, minWidth:20, height:20, alignItems:'center', justifyContent:'center', paddingHorizontal:5 },
  unreadBadgeText: { fontSize:10, fontWeight:'800', color:'#fff' },
  separator:    { height:1, backgroundColor:'rgba(255,255,255,0.04)', marginLeft:82 },

  // Thread
  threadHeader: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border, gap:12 },
  backBtn:      { width:36, height:36, alignItems:'center', justifyContent:'center' },
  backBtnText:  { fontSize:28, color:C.text, lineHeight:32 },
  threadTitle:  { fontSize:16, fontWeight:'800', color:C.text },
  threadSub:    { fontSize:11, color:C.textMuted, marginTop:1 },
  videoCallBtn: { width:40, height:40, borderRadius:12, backgroundColor:C.surfaceUp, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
  liveIndicator:{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(74,222,128,0.1)', borderWidth:1, borderColor:'rgba(74,222,128,0.3)', borderRadius:10, paddingHorizontal:8, paddingVertical:4 },
  liveDot:      { width:6, height:6, borderRadius:3, backgroundColor:C.green },
  liveText:     { fontSize:9, fontWeight:'800', color:C.green, letterSpacing:1.5 },

  messageList:  { paddingHorizontal:16, paddingVertical:12, gap:4 },

  // Bubbles
  bubbleRow:    { marginVertical:2 },
  bubbleRowMe:  { alignItems:'flex-end' },
  bubbleRowThem:{ alignItems:'flex-start' },
  bubbleName:   { fontSize:10, color:C.textMuted, marginBottom:3, marginLeft:4, fontWeight:'600', letterSpacing:0.3 },
  bubble:       { maxWidth:'78%', borderRadius:18, paddingHorizontal:14, paddingVertical:10 },
  bubbleMe:     { borderBottomRightRadius:4 },
  bubbleThem:   { backgroundColor:C.theirBubble, borderBottomLeftRadius:4, borderWidth:1, borderColor:C.border },
  bubbleText:   { fontSize:14, color:C.text, lineHeight:20 },
  bubbleTime:   { fontSize:10, color:C.textMuted, marginTop:4, textAlign:'right' },

  systemMsg:    { alignItems:'center', marginVertical:8 },
  systemMsgText:{ fontSize:11, color:C.textMuted, backgroundColor:C.surfaceUp, paddingHorizontal:12, paddingVertical:4, borderRadius:10 },
  vibeBubble:   { alignItems:'center', marginVertical:8 },
  vibeBubbleText:{ fontSize:12, color:C.purple, fontWeight:'600', backgroundColor:'rgba(168,85,247,0.1)', paddingHorizontal:14, paddingVertical:6, borderRadius:12, borderWidth:1, borderColor:'rgba(168,85,247,0.3)' },

  typingWrap:   { paddingLeft:16, paddingBottom:8 },
  typingBubble: { flexDirection:'row', gap:4, backgroundColor:C.surfaceUp, paddingHorizontal:12, paddingVertical:10, borderRadius:18, borderBottomLeftRadius:4, alignSelf:'flex-start', borderWidth:1, borderColor:C.border },
  typingDot:    { width:6, height:6, borderRadius:3, backgroundColor:C.textMuted },

  // Input
  inputRow:  { flexDirection:'row', alignItems:'flex-end', paddingHorizontal:16, paddingVertical:12, gap:10, borderTopWidth:1, borderTopColor:C.border },
  vibeBtn:   { width:42, height:42, borderRadius:14, backgroundColor:C.surfaceUp, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
  input:     { flex:1, backgroundColor:C.surfaceUp, borderRadius:18, paddingHorizontal:16, paddingVertical:10, color:C.text, fontSize:14, borderWidth:1, borderColor:C.border, maxHeight:100 },
  sendBtn:   { width:42, height:42, borderRadius:14, backgroundColor:C.purple, alignItems:'center', justifyContent:'center' },
  sendBtnDisabled: { opacity:0.35 },
  sendBtnText:{ fontSize:18, color:'#fff', fontWeight:'900' },
});

export default ChatScreen;
