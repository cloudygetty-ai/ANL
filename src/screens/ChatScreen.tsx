// src/screens/ChatScreen.tsx — Pure web, Supabase Realtime
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseReady } from '../config/supabase';

const C = {
  bg: '#04040a', surface: '#0d0d14', card: '#111118', border: 'rgba(168,85,247,0.15)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
  myBubble: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  theirBubble: '#1a1a24',
};

interface Message { id: string; sender_id: string; content: string; created_at: string; message_type: string; }
interface Props { conversationId: string; otherUserId: string; otherName: string; onBack: () => void; }

const ChatScreen: React.FC<Props> = ({ conversationId, otherUserId, otherName, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    init();
    return () => { supabase.channel(`chat:${conversationId}`).unsubscribe(); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    if (!isSupabaseReady) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // Load existing messages
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data || []);

    // Mark read
    await supabase.from('message_reads').upsert({ conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() });

    // Subscribe to new messages
    supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !myId || sending) return;
    setSending(true);
    setInput('');

    await supabase.from('messages').insert({
      conversation_id: conversationId, sender_id: myId,
      content: text, message_type: 'text',
    });

    // Update conversation last_message_at
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const isNewDay = (curr: string, prev?: string) => {
    if (!prev) return true;
    return new Date(curr).toDateString() !== new Date(prev).toDateString();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.text, fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}>←</button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.textDim }}>👤</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{otherName}</div>
          <div style={{ fontSize: 11, color: C.green }}>Online</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textDim, fontSize: 13, marginTop: 40 }}>
            Say hey — you matched for a reason 💜
          </div>
        )}
        {messages.map((msg, i) => {
          const mine = msg.sender_id === myId;
          const showDay = isNewDay(msg.created_at, messages[i - 1]?.created_at);
          return (
            <React.Fragment key={msg.id}>
              {showDay && (
                <div style={{ textAlign: 'center', color: C.textDim, fontSize: 11, margin: '12px 0', letterSpacing: 1 }}>
                  {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 18,
                  borderBottomRightRadius: mine ? 4 : 18,
                  borderBottomLeftRadius: mine ? 18 : 4,
                  background: mine ? C.myBubble : C.theirBubble,
                  color: C.text, fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word',
                }}>
                  {msg.content}
                  <div style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.5)' : C.textDim, marginTop: 4, textAlign: 'right' }}>{formatTime(msg.created_at)}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, padding: '10px 16px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message..."
          style={{
            flex: 1, padding: '12px 16px', fontSize: 15, background: C.card,
            color: C.text, border: `1px solid ${C.border}`, borderRadius: 24,
            outline: 'none', fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: input.trim() ? C.purple : 'rgba(168,85,247,0.2)',
            color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >↑</button>
      </div>
    </div>
  );
};

export default ChatScreen;
