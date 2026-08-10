import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Column<T> = {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
};

export type Filter<T> = {
  key: keyof T & string;
  label: string;
  options: string[];
};

const PAGE_WINDOW_SIZE = 5;

/** Returns a sliding window of page numbers centered on the current page. */
function getPageWindow(current: number, totalPages: number, windowSize = PAGE_WINDOW_SIZE) {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - windowSize + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKeys,
  filters = [],
  onView,
  onEdit,
  onDelete,
  pageSize = 8,
  loading = false,
  emptyMessage,
}: {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T & string)[];
  filters?: Filter<T>[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  /** May be sync or async; the confirm dialog awaits it and shows a "Deleting..." state. */
  onDelete?: (row: T) => void | Promise<void>;
  pageSize?: number;
  /** Shows a skeleton table body instead of rows while data is being fetched. */
  loading?: boolean;
  /** Overrides the default "no results" description shown when there are zero rows. */
  emptyMessage?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    let rows = data;
    if (query && searchKeys?.length) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)),
      );
    }
    for (const f of filters) {
      const v = filterState[f.key];
      if (v && v !== "all") rows = rows.filter((r) => String(r[f.key]) === v);
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey as keyof T] as unknown as string | number;
        const bv = b[sortKey as keyof T] as unknown as string | number;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, query, searchKeys, filters, filterState, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  const hasActions = Boolean(onView || onEdit || onDelete);
  const pageWindow = getPageWindow(current, pages);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pending) return;
    setIsDeleting(true);
    try {
      await onDelete?.(pending);
      toast.success(t("dashboard_common.deleteSuccess"));
      setPending(null);
    } catch (error) {
      console.error("Failed to delete record:", error);
      toast.error(t("dashboard_common.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // Force LTR layout for the entire table (search bar, filters, columns,
    // sort arrows, action menu, pagination) regardless of the page's
    // overall text direction.
    <div dir="ltr" className="space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("dashboard_common.search")}
            className="ps-9"
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={filterState[f.key] ?? "all"}
            onValueChange={(v) => {
              setFilterState((s) => ({ ...s, [f.key]: v }));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard_common.allOption", { label: f.label })}
              </SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      {c.header}
                      {sortKey === c.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.header}
                    </span>
                  )}
                </TableHead>
              ))}
              {hasActions && (
                <TableHead className="w-10 text-end">
                  <span className="sr-only">{t("dashboard_common.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-end">
                      <div className="ms-auto h-4 w-4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="p-0">
                  <EmptyState
                    title={t("dashboard_common.noResults")}
                    description={emptyMessage ?? t("dashboard_common.tryAdjustFilters")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              slice.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{t("dashboard_common.openRowMenu")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(row)}>
                              <Eye className="me-2 h-4 w-4" aria-hidden="true" />
                              {t("dashboard_common.view")}
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                              <Pencil className="me-2 h-4 w-4" aria-hidden="true" />
                              {t("dashboard_common.edit")}
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setPending(row)}
                              >
                                <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                                {t("dashboard_common.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("dashboard_common.showingResults", {
            shown: slice.length,
            total: filtered.length,
          })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(Math.max(1, current - 1))}
            disabled={current === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t("dashboard_common.previousPage")}</span>
          </Button>
          {pageWindow[0] > 1 && (
            <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
              …
            </span>
          )}
          {pageWindow.map((p) => (
            <Button
              key={p}
              variant={current === p ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p)}
              disabled={loading}
              aria-current={current === p ? "page" : undefined}
            >
              {p}
            </Button>
          ))}
          {pageWindow[pageWindow.length - 1] < pages && (
            <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
              …
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(Math.min(pages, current + 1))}
            disabled={current === pages || loading}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t("dashboard_common.nextPage")}</span>
          </Button>
        </div>
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !isDeleting && setPending(null)}
      >
        <AlertDialogContent dir="ltr" className="text-left">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard_common.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard_common.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent the dialog from closing automatically so we can
                // keep it open with a "Deleting..." state until the async
                // delete call settles.
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                isDeleting && "opacity-80",
              )}
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("dashboard_common.deleting")}
                </span>
              ) : (
                t("dashboard_common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}