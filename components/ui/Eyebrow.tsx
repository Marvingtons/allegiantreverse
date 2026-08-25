import { clsx } from "@/lib/clsx";

/**
 * Section label in Spline Sans Mono.
 *
 * Structural conceit: ALTA settlement statements number every line item — the
 * 1100s are title charges. Services are LINE 1101, LINE 1102 and so on. Real
 * settlement-statement vocabulary; brokers read it as fluency, not decoration.
 */
export default function Eyebrow({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "div" | "h2";
}) {
  return (
    <Tag
      className={clsx(
        // The one eyebrow spec: mono 11px / 0.34em (the text-eyebrow token).
        // Colour comes from --eyebrow-fg so it is identical on fog and paper
        // and still legible on ink grounds (see globals.css).
        "font-mono text-eyebrow uppercase text-[color:var(--eyebrow-fg)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
