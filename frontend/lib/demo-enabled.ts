/** Presenter autoplay — on by default; set NEXT_PUBLIC_ENABLE_DEMO=false to hide. */
export function isDemoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false";
}
