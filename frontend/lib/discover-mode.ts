/** True when discover resolves quickly (seeded / local data). */
export function isFastDiscoverMode(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_DEMO_DATA?.toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
