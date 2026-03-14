// src/components/MetricCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricCardProps {
  label: string;
  value: string | number;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => (
  <View style={styles.card}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: '31%',
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  value: { fontSize: 18, fontWeight: 'bold', color: '#f0eee8', marginBottom: 2 },
  label: { fontSize: 11, color: '#8b8a99', textAlign: 'center' },
});

export default MetricCard;
