// src/utils/format.ts
// Display formatting utilities

/** "2 min ago", "just now", "3h ago", "yesterday" */
export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10)  return 'just now';
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7)   return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** "11:45 PM" */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Truncate with ellipsis */
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

/** First name only, title-cased */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** "24M" / "24F" / "24TW" display */
export function ageGender(age: number, gender: string): string {
  const g = gender === 'f' ? 'F' : gender === 'm' ? 'M' : gender === 'tw' ? 'TW' : 'TM';
  return `${age}${g}`;
}

/** Format match score with color tier label */
export function matchLabel(score: number): string {
  if (score >= 90) return '🔥 Hot match';
  if (score >= 75) return '✨ Great match';
  if (score >= 60) return '👍 Good match';
  return 'New here';
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
