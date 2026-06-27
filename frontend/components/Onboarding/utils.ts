export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinList(items: string[]): string {
  return items.join(", ");
}

export function toggleListItem(items: string[], item: string): string[] {
  if (items.includes(item)) {
    return items.filter((entry) => entry !== item);
  }
  return [...items, item];
}
