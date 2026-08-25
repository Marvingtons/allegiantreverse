/** Tiny class joiner — no dependency needed for what this build does. */
export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
