import { useSocketStore } from '../stores/socketStore';

export function useSocket() {
  return useSocketStore((s) => s.socket);
}
