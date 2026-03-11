// src/utils/format.ts — Text and time formatting utilities

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function firstName(name: string): string {
  return name.split(' ')[0];
}

export function ageGender(age: number, gender: string): string {
  const g = gender.charAt(0).toUpperCase();
  return `${age}${g}`;
}

export function matchLabel(score: number): string {
  if (score >= 90) return 'Perfect Match';
  if (score >= 70) return 'Great Match';
  if (score >= 50) return 'Good Match';
  return 'New';
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
