/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/VideoCallScreen.tsx
// Full-screen video call wrapper — re-exports VideoScreen with call params.
// Uses the same VideoScreen component but is registered as a separate stack entry
// so RootNavigator can type-check the VideoCall route params independently.
import React from 'react';
import VideoScreen from './VideoScreen';

export default function VideoCallScreen({ navigation, route }: any) {
  // Map VideoCall stack params → VideoScreen props
  const {
    callId:      _callId,
    targetUserId,
    callType:    _callType,
    isIncoming:  _isIncoming,
  } = route?.params ?? {};

  return (
    <VideoScreen
      navigation={navigation}
      route={{
        ...route,
        params: {
          userId:   targetUserId,
          userName: route?.params?.callerName ?? 'User',
        },
      }}
    />
  );
}
