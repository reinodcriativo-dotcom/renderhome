import type { SpaceStatus } from "@/types/database";
import { STATUS_COLOR, STATUS_LABEL, cn } from "@/lib/utils";

export default function SpaceStatusBadge({ status }: { status: SpaceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium",
        STATUS_COLOR[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
