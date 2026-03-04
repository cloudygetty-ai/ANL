// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, Easing, TouchableOpacity,
  Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSystemStore } from '@services/state/systemStore';
import { getEventLoop, getHealth } from '@core/SystemInitializer';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#060609',
  surface:   '#0d0d14',
  surfaceUp: '#13131e',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  purpleDim: 'rgba(168,85,247,0.25)',
  pink:      '#ec4899',
  cyan:      '#22d3ee',
  green:     '#4ade80',
  red:       '#f87171',
  amber:     '#fbbf24',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.45)',
  textMuted: 'rgba(240,238,232,0.2)',
};

// ─── Pulse dot ────────────────────────────────────────────────────────────────
const PulseDot: React.FC<{ color: string }> = ({ color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.6, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 0,   useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0,   useNativeDriver: true }),
        ]),
        Animated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]} />
      <View style={[styles.pulseDot, { backgroundColor: color }]} />
    </View>
  );
};

// ─── Metric card ─────────────────────────────────────────────────────────────
const MetricCard: React.FC<{ label: string; value: string | number; accent?: string; sub?: string }> = ({
  label, value, accent = C.purple, sub,
}) => (
  <View style={[styles.metricCard, { borderColor: `${accent}30` }]}>
    <View style={[styles.metricAccentBar, { backgroundColor: accent }]} />
    <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
  </View>
);

// ─── Error row ────────────────────────────────────────────────────────────────
const ErrorRow: React.FC<{ module: string; message: string; time: number }> = ({ module, message, time }) => (
  <View style={styles.errorRow}>
    <View style={[styles.errorDot, { backgroundColor: C.red }]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.errorModule}>{module}</Text>
      <Text style={styles.errorMsg} numberOfLines={1}>{message}</Text>
    </View>
    <Text style={styles.errorTime}>{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
  </View>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHead: React.FC<{ label: string; right?: React.ReactNode }> = ({ label, right }) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionHeadLine} />
    <Text style={styles.sectionHeadText}>{label}</Text>
    <View style={[styles.sectionHeadLine, { flex: 1 }]} />
    {right}
  </View>
);

// ─── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ values: number[]; color: string; width?: number; height?: number }> = ({
  values, color, width = SW - 64, height = 36,
}) => {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4)}`)
    .join(' ');
  // React Native doesn't have SVG built-in — render as flat bars instead
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 2 }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, (v / max) * height),
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.3 + (i / values.length) * 0.7,
          }}
        />
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const { systemState, health } = useSystemStore();
  const [iterCount, setIterCount]   = useState(0);
  const [expanded,  setExpanded]    = useState<'errors' | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Poll event loop iteration count (not in store)
  useEffect(() => {
    const t = setInterval(() => {
      const loop = getEventLoop();
      if (loop) setIterCount(loop.getIterationCount());
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Entrance animation
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const statusColor =
    systemState.status === 'running'  ? C.green  :
    systemState.status === 'degraded' ? C.amber  : C.textMuted;

  const formatUptime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0)  return `${d}d ${h % 24}h`;
    if (h > 0)  return `${h}h ${m % 60}m`;
    if (m > 0)  return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const iterationTimes: number[] = (health as any)._iterationTimes ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }]}>
          <View>
            <Text style={styles.wordmark}>
              <Text style={{ color: C.purple }}>ANL</Text>
              {'  '}
              <Text style={styles.wordmarkSub}>SYSTEM</Text>
            </Text>
            <Text style={styles.headerSub}>Continuous Operation Engine</Text>
          </View>
          <View style={styles.statusBadge}>
            <PulseDot color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {systemState.status.toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        {/* ── Recovery banner ── */}
        {systemState.recovery.restoredFromSnapshot && (
          <View style={styles.recoveryBanner}>
            <Text style={styles.recoveryIcon}>↑</Text>
            <Text style={styles.recoveryText}>
              Restored from snapshot · Recovery #{systemState.recovery.count}
            </Text>
          </View>
        )}

        {/* ── Hero stat ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>UPTIME</Text>
              <Text style={styles.heroValue}>{formatUptime(health.uptimeMs)}</Text>
              <Text style={styles.heroSub}>
                {iterCount.toLocaleString()} iterations · {health.avgIterationMs}ms avg
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.heroLabel}>LOOP HEALTH</Text>
              <Text style={[styles.heroValue, {
                color: health.p95IterationMs > 4000 ? C.amber :
                       health.p95IterationMs > 2000 ? C.cyan  : C.green,
              }]}>
                {health.p95IterationMs}ms
              </Text>
              <Text style={styles.heroSub}>p95 iteration</Text>
            </View>
          </View>
        </View>

        {/* ── Metrics grid ── */}
        <SectionHead label="METRICS" />
        <View style={styles.metricsGrid}>
          <MetricCard label="Errors"      value={health.errorCount}           accent={health.errorCount > 10 ? C.red   : C.purple} />
          <MetricCard label="Recoveries"  value={health.recoveryEvents}       accent={C.cyan}   />
          <MetricCard label="Mem Pressure" value={health.memoryPressureEvents} accent={C.amber}  />
          <MetricCard label="Avg Loop"    value={`${health.avgIterationMs}ms`} accent={C.pink}   />
          <MetricCard label="p95 Loop"    value={`${health.p95IterationMs}ms`} accent={C.purple} />
          <MetricCard label="Iteration"   value={systemState.iteration.toLocaleString()} accent={C.cyan} />
        </View>

        {/* ── System info ── */}
        <SectionHead label="SYSTEM INFO" />
        <View style={styles.infoCard}>
          {[
            { label: 'Status',    value: systemState.status },
            { label: 'Started',   value: new Date(systemState.startedAt).toLocaleString() },
            { label: 'Snapshots', value: `${systemState.recovery.count} recoveries` },
            { label: 'Last recovery',
              value: systemState.recovery.lastRecoveredAt
                ? new Date(systemState.recovery.lastRecoveredAt).toLocaleTimeString()
                : '—'
            },
          ].map(({ label, value }, i, arr) => (
            <View key={label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Error log ── */}
        {health.errorLog.length > 0 && (
          <>
            <SectionHead
              label={`ERRORS (${health.errorLog.length})`}
              right={
                <TouchableOpacity onPress={() => setExpanded(p => p === 'errors' ? null : 'errors')}>
                  <Text style={[styles.sectionHeadText, { color: C.purple, marginLeft: 8 }]}>
                    {expanded === 'errors' ? 'LESS' : 'ALL'}
                  </Text>
                </TouchableOpacity>
              }
            />
            <View style={styles.infoCard}>
              {(expanded === 'errors'
                ? health.errorLog.slice().reverse()
                : health.errorLog.slice(-3).reverse()
              ).map(err => (
                <ErrorRow key={err.id} module={err.module} message={err.message} time={err.timestamp} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  wordmark:    { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: 2 },
  wordmarkSub: { fontSize: 28, fontWeight: '300', color: C.textDim, letterSpacing: 6 },
  headerSub:   { fontSize: 11, color: C.textMuted, letterSpacing: 1, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceUp, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Recovery
  recoveryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: 10, padding: 10, marginBottom: 16 },
  recoveryIcon:   { fontSize: 16, color: C.green },
  recoveryText:   { fontSize: 12, color: C.green, fontWeight: '600' },

  // Hero
  heroCard:  { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  heroGlow:  { position: 'absolute', top: -40, left: '25%', width: 160, height: 160, borderRadius: 80, backgroundColor: C.purpleDim, opacity: 0.35 },
  heroRow:   { flexDirection: 'row', alignItems: 'center' },
  heroLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  heroValue: { fontSize: 32, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  heroSub:   { fontSize: 11, color: C.textDim, marginTop: 4 },
  heroDivider: { width: 1, height: 60, backgroundColor: C.border, marginHorizontal: 20 },

  // Section
  sectionHead:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionHeadLine: { height: 1, width: 16, backgroundColor: C.border },
  sectionHeadText: { fontSize: 10, color: C.textMuted, fontWeight: '700', letterSpacing: 2 },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  metricCard:  { width: (SW - 48) / 3, backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, overflow: 'hidden' },
  metricAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  metricValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 10, color: C.textDim, letterSpacing: 0.5 },
  metricSub:   { fontSize: 9, color: C.textMuted, marginTop: 2 },

  // Info card
  infoCard:      { backgroundColor: C.surface, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.08)' },
  infoLabel:     { fontSize: 12, color: C.textDim },
  infoValue:     { fontSize: 12, color: C.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Errors
  errorRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(248,113,113,0.08)' },
  errorDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  errorModule: { fontSize: 11, color: C.red, fontWeight: '700', marginBottom: 2 },
  errorMsg:    { fontSize: 11, color: C.textDim },
  errorTime:   { fontSize: 10, color: C.textMuted },

  // Pulse dot
  pulseRing: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  pulseDot:  { width: 6, height: 6, borderRadius: 3 },
});

export default HomeScreen;
