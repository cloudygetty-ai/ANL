// src/components/StatusIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SystemStatus } from '@types/index';

const STATUS_COLORS: Record<SystemStatus, string> = {
  running: '#22c55e',
  degraded: '#f59e0b',
  initializing: '#3b82f6',
  stopped: '#6b7280',
};

interface StatusIndicatorProps {
  status: SystemStatus;
  size?: number;
  showLabel?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 10,
  showLabel = false,
}) => {
  const color = STATUS_COLORS[status];
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, { color }]}>{status.toUpperCase()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {},
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

export default StatusIndicator;
