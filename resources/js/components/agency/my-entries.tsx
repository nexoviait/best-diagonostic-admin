import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, FileDown, Pencil } from "lucide-react";

import { agencyApiRequest } from "@/lib/agency-api";
import { toastApiError } from "@/lib/toast-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { NewEntryForm } from "./new-entry-form";

export function MyEntries() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["agency-my-entries", search, page],
    queryFn: () =>
      agencyApiRequest(`/agency/patients?page=${page}&per_page=20${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;

  const handleDownload = async (patient: any) => {
    if (!patient.passport_no) {
      toast.error("Add a passport number to this entry before downloading its report.");
      return;
    }
    // Open the tab synchronously, inside the click itself — opening it after the await below
    // loses the "user gesture" the browser needs to allow a new tab, so it gets silently blocked
    // as a popup instead (looks like the button does nothing). This blank tab is then redirected
    // to the real PDF once it's ready.
    const newTab = window.open("", "_blank");
    setDownloadingId(patient.id);
    try {
      const res = await agencyApiRequest(
        `/public/certificate/search?passport_no=${encodeURIComponent(patient.passport_no)}&token=${encodeURIComponent(patient.pax_id)}`,
      );
      if (newTab) {
        newTab.location.href = res.pdf_url;
      } else {
        toast.error("Please allow pop-ups for this site to download the report.");
      }
    } catch (err: any) {
      newTab?.close();
      toastApiError(err, "Could not generate the report right now.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="card-surface">
      <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">My Entries</h3>
          <p className="text-xs text-muted-foreground">{total} entries submitted by your agency</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, Pax ID, passport..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No entries yet. Submit one from "New Entry" in the sidebar.
          </div>
        ) : (
          entries.map((p: any) => (
            <div key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{p.pax_id}</span>
                  <span className="text-xs text-muted-foreground">{p.date}</span>
                </div>
                <p className="mt-0.5 truncate font-medium">
                  {p.first_name} {p.last_name || ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.country?.name || "N/A"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label={p.medical_report?.final_status} />
                <Badge variant="outline" className="text-xs">X-Ray: {p.xray_report?.result || "Pending"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditingPatient(p)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(p)}
                  disabled={downloadingId === p.id}
                >
                  {downloadingId === p.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="mr-1 h-3.5 w-3.5" />
                  )}
                  Report
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between border-t border-border/60 p-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {lastPage}</span>
          <Button variant="outline" size="sm" disabled={page === lastPage} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="thin-scrollbar max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit entry</DialogTitle>
          </DialogHeader>
          {editingPatient && (
            <NewEntryForm
              patient={editingPatient}
              onSuccess={() => {
                setEditingPatient(null);
                queryClient.invalidateQueries({ queryKey: ["agency-my-entries"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
