// hooks/useVideoCall.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for production:
  // { urls: 'turn:your-turn-server.com', username: 'x', credential: 'y' },
];

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended';

interface UseVideoCallReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;
  callId: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  initiateCall: (targetUserId: string, callType?: 'video' | 'audio') => Promise<void>;
  acceptCall: (incomingCallId: string, callerId: string) => Promise<void>;
  rejectCall: (incomingCallId: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
}

export function useVideoCall(): UseVideoCallReturn {
  const socket = useSocketStore((s) => s.socket);
  const { user } = useAuthStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // ─── CREATE PEER CONNECTION ────────────────────────────────
  const createPC = useCallback((targetUserId: string, currentCallId: string) => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc:ice-candidate', {
          callId: currentCallId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (event.streams?.[0]) setRemoteStream(event.streams[0]);
    };

    peerConnection.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
        endCall();
      }
    };

    return peerConnection;
  }, [socket]);

  // ─── GET LOCAL MEDIA ──────────────────────────────────────
  async function getLocalStream(video = true): Promise<MediaStream> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: 'user', width: 720, height: 1280 } : false,
    });
    setLocalStream(stream);
    return stream;
  }

  // ─── INITIATE CALL ────────────────────────────────────────
  const initiateCall = useCallback(async (targetUserId: string, callType = 'video') => {
    setCallStatus('calling');
    const stream = await getLocalStream(callType === 'video');

    socket?.emit('call:initiate', { targetUserId, callType });

    socket?.once('call:ringing', async ({ callId: cId }: { callId: string }) => {
      setCallId(cId);

      pc.current = createPC(targetUserId, cId);
      stream.getTracks().forEach((track) => pc.current!.addTrack(track, stream));

      socket?.once('call:accepted', async ({ callId: acceptedId }: any) => {
        if (acceptedId !== cId) return;
        setCallStatus('connected');

        const offer = await pc.current!.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.current!.setLocalDescription(offer);

        socket?.emit('webrtc:offer', { callId: cId, targetUserId, offer });
      });
    });
  }, [socket, createPC]);

  // ─── ACCEPT CALL ──────────────────────────────────────────
  const acceptCall = useCallback(async (incomingCallId: string, callerId: string) => {
    setCallId(incomingCallId);
    setCallStatus('connected');

    const stream = await getLocalStream(true);
    pc.current = createPC(callerId, incomingCallId);
    stream.getTracks().forEach((track) => pc.current!.addTrack(track, stream));

    // Apply any buffered candidates
    for (const c of pendingCandidates.current) {
      await pc.current.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates.current = [];

    socket?.emit('call:accept', { callId: incomingCallId });
  }, [socket, createPC]);

  // ─── REJECT CALL ──────────────────────────────────────────
  const rejectCall = useCallback((incomingCallId: string) => {
    socket?.emit('call:reject', { callId: incomingCallId });
    setCallStatus('idle');
  }, [socket]);

  // ─── END CALL ─────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (callId) socket?.emit('call:end', { callId });

    pc.current?.close();
    pc.current = null;
    localStream?.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 1500);
  }, [callId, localStream, socket]);

  // ─── CONTROLS ─────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((m) => !m);
    socket?.emit('call:toggle-mute', { callId, muted: !isMuted });
  }, [localStream, isMuted, callId, socket]);

  const toggleVideo = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
    setIsVideoOff((v) => !v);
    socket?.emit('call:toggle-video', { callId, videoOff: !isVideoOff });
  }, [localStream, isVideoOff, callId, socket]);

  const flipCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t: any) => t._switchCamera?.());
  }, [localStream]);

  // ─── SOCKET EVENT LISTENERS ───────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc:offer', async ({ callId: cId, fromUserId, offer }: any) => {
      if (!pc.current) return;
      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.emit('webrtc:answer', { callId: cId, targetUserId: fromUserId, answer });
    });

    socket.on('webrtc:answer', async ({ answer }: any) => {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc:ice-candidate', async ({ candidate }: any) => {
      if (pc.current?.remoteDescription) {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    socket.on('call:ended', ({ duration }: any) => endCall());
    socket.on('call:unavailable', () => {
      setCallStatus('idle');
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('call:ended');
      socket.off('call:unavailable');
    };
  }, [socket, endCall]);

  return {
    localStream, remoteStream, callStatus, callId,
    isMuted, isVideoOff,
    initiateCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, flipCamera,
  };
}
