// src/screens/AIAssistantScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

type Props = NativeStackScreenProps<any, 'AIAssistant'>;

const STARTERS = [
  'Write me an icebreaker opener',
  'Help me respond to this message',
  'What should I say first?',
  'Make my bio more interesting',
];

const CANNED: Record<string, string> = {
  'Write me an icebreaker opener': 'Try: "The vibe you\'re giving is midnight mischief. What are you actually up to tonight?"',
  'Help me respond to this message': 'Keep it playful and short. Match their energy — if they\'re flirty, be flirty back. Ask one question.',
  'What should I say first?': '"Hey, you nearby? I\'m free for the next hour."  Simple, direct, works.',
  'Make my bio more interesting': 'Drop the generic stuff. Try: "Out tonight. Looking for something real, or at least interesting. [your vibe tag]"',
};

const AIAssistantScreen: React.FC<Props> = ({ navigation }) => {
  const [msgs, setMsgs] = useState<{ from: 'me' | 'ai'; text: string }[]>([
    { from: 'ai', text: 'Hey. I\'m your ANL AI — I help you connect better. What do you need?' },
  ]);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { from: 'me' as const, text: text.trim() };
    const reply = CANNED[text.trim()] ?? 'Good question. Keep it real — authenticity connects faster than a perfect line.';
    setMsgs(m => [...m, userMsg, { from: 'ai', text: reply }]);
    setInput('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>‹</Text></TouchableOpacity>
        <Text style={s.title}>AI Assistant</Text>
        <View style={{ width: 32 }}/>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView style={s.msgs} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          {msgs.map((m, i) => (
            <View key={i} style={[s.bubble, m.from === 'me' ? s.bubbleMe : s.bubbleAi]}>
              <Text style={[s.bubbleText, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.starters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {STARTERS.map(q => (
              <TouchableOpacity key={q} style={s.chip} onPress={() => send(q)}>
                <Text style={s.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            placeholderTextColor={C.textDim}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity style={s.sendBtn} onPress={() => send(input)}>
            <Text style={s.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back:       { fontSize: 28, color: C.purple },
  title:      { fontSize: 16, fontWeight: '700', color: C.text },
  msgs:       { flex: 1 },
  bubble:     { maxWidth: '80%', borderRadius: 14, padding: 12, marginBottom: 10 },
  bubbleMe:   { alignSelf: 'flex-end', backgroundColor: C.purple },
  bubbleAi:   { alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  starters:   { paddingVertical: 10 },
  chip:       { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipText:   { fontSize: 12, color: C.textDim },
  inputRow:   { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 10 },
  input:      { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14 },
  sendBtn:    { width: 46, height: 46, borderRadius: 23, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  sendIcon:   { fontSize: 20, color: '#fff', fontWeight: '700' },
});

export default AIAssistantScreen;
