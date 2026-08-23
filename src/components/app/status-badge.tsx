import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/status-colors";

/**
 * Badge that renders an Application Status name in its pipeline color.
 * Falls back to the neutral secondary look when the name or color is missing.
 */
export function StatusBadge({
  name,
  color,
  className,
}: {
  name: string | null;
  color?: string | null;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(statusBadgeClass(color), className)}>
      {name ?? "—"}
    </Badge>
  );
}
