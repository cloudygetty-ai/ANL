/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/AIAssistantScreen.tsx
// AI relationship coach — premium feature. Gives conversation starters,
// profile feedback, and real-time chat suggestions.
// TODO[HIGH]: wire to backend AI endpoint (OpenAI / Anthropic)
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGate } from '@hooks/useGate';

const C = {
  bg:          '#04040a',
  surface:     '#0d0d14',
  surfaceUp:   '#13131e',
  border:      'rgba(168,85,247,0.18)',
  purple:      '#a855f7',
  text:        '#f0eee8',
  textDim:     'rgba(240,238,232,0.5)',
  myBubble:    '#a855f7',
  aiBubble:    '#13131e',
};

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

const STARTER_PROMPTS = [
  'Write an opening message for my match',
  'Review my bio and suggest improvements',
  'Help me respond to this message',
  'Give me 3 date night ideas in NYC',
];

export default function AIAssistantScreen({ navigation, route: _route }: any) {
  const { gate } = useGate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id:      'welcome',
      role:    'assistant',
      content: "Hey! I'm your ANL AI coach. I can write opening lines, review your profile, or help you craft the perfect reply. What do you need?",
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    // Gate check — AI coach is premium
    if (!gate('ai_coach')) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // TODO[HIGH]: replace stub with real API call to /ai/coach
      await new Promise((r) => setTimeout(r, 1200)); // simulate latency
      const reply: Message = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: `Got it — here's a suggestion for "${content.slice(0, 40)}...". In production this will call your AI backend.`,
      };
      setMessages((m) => [...m, reply]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
        />

        {/* Starter prompts */}
        {messages.length === 1 && (
          <View style={styles.starters}>
            {STARTER_PROMPTS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.starterBtn}
                onPress={() => sendMessage(p)}
                activeOpacity={0.75}
              >
                <Text style={styles.starterText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Typing indicator */}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color={C.textDim} />
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask the coach..."
            placeholderTextColor={C.textDim}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  back:         { fontSize: 22, color: C.textDim, paddingRight: 4 },
  headerTitle:  { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  premiumBadge: { backgroundColor: 'rgba(128,0,32,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#800020' },
  premiumText:  { fontSize: 10, fontWeight: '800', color: '#cc3355', letterSpacing: 1 },

  messageList: { padding: 16, gap: 10 },
  bubble:      { maxWidth: '82%', padding: 14, borderRadius: 18, marginBottom: 4 },
  userBubble:  { alignSelf: 'flex-end', backgroundColor: C.myBubble, borderBottomRightRadius: 4 },
  aiBubble:    { alignSelf: 'flex-start', backgroundColor: C.aiBubble, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText:  { fontSize: 15, color: C.text, lineHeight: 22 },
  userBubbleText: { color: '#fff' },
  typingBubble:{ paddingVertical: 10, marginLeft: 16, marginBottom: 8 },

  starters:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  starterBtn:  { backgroundColor: C.surfaceUp, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  starterText: { fontSize: 13, color: C.textDim },

  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  input:           { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendIcon:        { fontSize: 20, color: '#fff', fontWeight: '800' },
});
