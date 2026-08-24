import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TablePagination({
  page,
  totalPages,
  total,
  previousHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  previousHref: string;
  nextHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="mr-1 text-muted-foreground">
        {total} {total === 1 ? "Candidate" : "Candidates"}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        nativeButton={false}
        render={
          <Link
            href={previousHref}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          />
        }
        className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
        aria-label="Previous page"
        title="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-24 text-center text-muted-foreground">
        page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        nativeButton={false}
        render={
          <Link
            href={nextHref}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
          />
        }
        className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
        aria-label="Next page"
        title="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
