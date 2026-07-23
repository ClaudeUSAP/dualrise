import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES } from "@/lib/athleteStatus";

// Accepts canonical athlete statuses, legacy raw values ('new'/'archived'),
// and a couple of non-status variants used elsewhere ('updated').
type BadgeType =
  | 'in_creation'
  | 'available'
  | 'committed'
  | 'in_college'
  | 'new' // legacy → available styling
  | 'archived' // legacy → in_college styling
  | 'updated';

interface StatusBadgeProps {
  type: BadgeType;
  onImage?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const extraVariants: Record<'new' | 'archived' | 'updated', string> = {
  new: STATUS_BADGE_CLASSES.available,
  archived: STATUS_BADGE_CLASSES.in_college,
  updated: "bg-blue-50 text-blue-800 border-blue-300",
};

function variantFor(type: BadgeType): string {
  if (type in STATUS_BADGE_CLASSES) {
    return STATUS_BADGE_CLASSES[type as keyof typeof STATUS_BADGE_CLASSES];
  }
  return extraVariants[type as keyof typeof extraVariants];
}

export function StatusBadge({ type, onImage = false, children, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 md:px-3 py-0.5 md:py-1 text-[11px] md:text-sm font-semibold tracking-wide shadow-sm border",
        variantFor(type),
        onImage && "backdrop-blur-[1px] bg-opacity-95 shadow-md ring-1 ring-black/5",
        className
      )}
    >
      {children || type.toUpperCase()}
    </div>
  );
}
