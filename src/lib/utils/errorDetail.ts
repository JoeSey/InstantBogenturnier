// Surfaces the actual error name/message alongside the user-facing string. Installed
// PWAs have no accessible devtools console on iPadOS/macOS, so a bare "failed" message
// gives no way to diagnose what actually broke — appending this detail to the on-screen
// error is the only debugging channel available in that context.
export function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}
