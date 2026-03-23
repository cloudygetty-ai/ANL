// src/hooks/useVideoCall.ts
// Fetches TURN credentials from backend before initiating WebRTC
// Handles full call lifecycle: initiate → signaling → cleanup

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { api } from '../services/api';

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'failed';

interface IceConfig {
  iceServers: RTCIceServer[];
  ttl?: number;
}

interface UseVideoCallReturn {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initiateCall: (matchId: string) => Promise<void>;
  acceptCall: (callId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  rejectCall: (callId: string) => void;
  endCall: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
}

export function useVideoCall(): UseVideoCallReturn {
  const socket = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceConfigRef = useRef<IceConfig | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // Fetch TURN credentials once and cache for TTL
  const getIceConfig = useCallback(async (): Promise<IceConfig> => {
    if (iceConfigRef.current) return iceConfigRef.current;
    const { data } = await api.get<IceConfig>('/ice/config');
    iceConfigRef.current = data;
    // Auto-expire cache after TTL
    if (data.ttl) {
      setTimeout(() => { iceConfigRef.current = null; }, data.ttl * 1000 * 0.9);
    }
    return data;
  }, []);

  const createPeerConnection = useCallback(async () => {
    const iceConfig = await getIceConfig();
    const pc = new RTCPeerConnection(iceConfig);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && currentCallIdRef.current) {
        socket?.emit('webrtc:ice-candidate', {
          callId: currentCallIdRef.current,
          candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setCallState(pc.connectionState === 'failed' ? 'failed' : 'ended');
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, getIceConfig]);

  const getLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    setLocalStream(stream);
    return stream;
  };

  const initiateCall = useCallback(async (matchId: string) => {
    try {
      setCallState('calling');
      const [stream, pc] = await Promise.all([getLocalStream(), createPeerConnection()]);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call:initiate', { matchId, offer }, (callId: string) => {
        currentCallIdRef.current = callId;
      });
    } catch (err) {
      console.error('initiateCall error:', err);
      setCallState('failed');
      cleanup();
    }
  }, [socket, createPeerConnection]);

  const acceptCall = useCallback(async (callId: string, offer: RTCSessionDescriptionInit) => {
    try {
      currentCallIdRef.current = callId;
      const [stream, pc] = await Promise.all([getLocalStream(), createPeerConnection()]);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('call:accept', { callId, answer });
    } catch (err) {
      console.error('acceptCall error:', err);
      setCallState('failed');
      cleanup();
    }
  }, [socket, createPeerConnection]);

  const rejectCall = useCallback((callId: string) => {
    socket?.emit('call:reject', { callId });
    setCallState('idle');
  }, [socket]);

  const endCall = useCallback(() => {
    if (currentCallIdRef.current) {
      socket?.emit('call:end', { callId: currentCallIdRef.current });
    }
    cleanup();
  }, [socket]);

  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    currentCallIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
  }, [localStream]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(prev => !prev);
  }, [localStream]);

  // Socket signaling handlers
  useEffect(() => {
    if (!socket) return;

    const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const onCallEnded = () => { setCallState('ended'); cleanup(); };
    const onCallRejected = () => { setCallState('ended'); cleanup(); };
    const onCallIncoming = ({ callId, offer }: { callId: string; offer: RTCSessionDescriptionInit }) => {
      currentCallIdRef.current = callId;
      setCallState('ringing');
      // Emit to RootNavigator via event bus or global state
    };

    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIceCandidate);
    socket.on('call:ended', onCallEnded);
    socket.on('call:rejected', onCallRejected);
    socket.on('call:incoming', onCallIncoming);

    return () => {
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIceCandidate);
      socket.off('call:ended', onCallEnded);
      socket.off('call:rejected', onCallRejected);
      socket.off('call:incoming', onCallIncoming);
    };
  }, [socket, cleanup]);

  return {
    callState,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  };
}
