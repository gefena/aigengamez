const KEY = (id: string) => `play_${id}`;

export function getPlayCount(id: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(KEY(id)) ?? "0", 10);
}

export function incrementPlayCount(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(id), String(getPlayCount(id) + 1));
}

export function getAllPlayCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const result: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("play_")) {
      result[key.slice(5)] = parseInt(localStorage.getItem(key) ?? "0", 10);
    }
  }
  return result;
}
