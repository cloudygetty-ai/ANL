// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSystemStore } from '@services/state/systemStore';
import { getEventLoop } from '@core/SystemInitializer';

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const color = status === 'running' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : '#6b7280';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
};

const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const HomeScreen: React.FC = () => {
  const { systemState, health } = useSystemStore();
  const [iterationCount, setIterationCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const loop = getEventLoop();
      if (loop) setIterationCount(loop.getIterationCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Header */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <StatusDot status={systemState.status} />
          <Text style={styles.statusText}>
            {systemState.status.toUpperCase()}
          </Text>
          {systemState.recovery.restoredFromSnapshot && (
            <Text style={styles.recoveryBadge}>↑ Restored</Text>
          )}
        </View>
        <Text style={styles.statusSub}>
          Event loop running · {iterationCount.toLocaleString()} iterations
        </Text>
      </View>

      {/* Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard label="Uptime" value={formatUptime(health.uptimeMs)} />
        <MetricCard label="Errors" value={health.errorCount} />
        <MetricCard label="Avg Loop" value={`${health.avgIterationMs}ms`} />
        <MetricCard label="p95 Loop" value={`${health.p95IterationMs}ms`} />
        <MetricCard label="Recovery" value={health.recoveryEvents} />
        <MetricCard label="Mem Pressure" value={health.memoryPressureEvents} />
      </View>

      {/* Recent Errors */}
      {health.errorLog.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Errors</Text>
          {health.errorLog.slice(-5).reverse().map((err) => (
            <View key={err.id} style={styles.errorCard}>
              <Text style={styles.errorModule}>{err.module}</Text>
              <Text style={styles.errorMsg} numberOfLines={2}>{err.message}</Text>
              <Text style={styles.errorTime}>
                {new Date(err.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* System Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Started</Text>
          <Text style={styles.infoValue}>
            {new Date(systemState.startedAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Snapshot recoveries</Text>
          <Text style={styles.infoValue}>{systemState.recovery.count}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Loop iteration</Text>
          <Text style={styles.infoValue}>{systemState.iteration.toLocaleString()}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: '#111118', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '700', color: '#f0eee8', letterSpacing: 1 },
  recoveryBadge: { fontSize: 11, color: '#22c55e', backgroundColor: 'rgba(34,197,94,.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusSub: { fontSize: 12, color: '#8b8a99' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricCard: {
    width: '31%', backgroundColor: '#111118',
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#f0eee8', marginBottom: 2 },
  metricLabel: { fontSize: 11, color: '#8b8a99', textAlign: 'center' },
  section: {
    backgroundColor: '#111118', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#4a4960', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  errorCard: { backgroundColor: 'rgba(239,68,68,.06)', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,.15)' },
  errorModule: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginBottom: 2 },
  errorMsg: { fontSize: 12, color: '#f0eee8', lineHeight: 18 },
  errorTime: { fontSize: 10, color: '#8b8a99', marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.04)' },
  infoLabel: { fontSize: 13, color: '#8b8a99' },
  infoValue: { fontSize: 13, color: '#f0eee8' },
});

export default HomeScreen;
