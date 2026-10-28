import { createFileRoute } from "@tanstack/react-router";
import { AgencyShell } from "@/components/agency/agency-shell";
import { MyEntries } from "@/components/agency/my-entries";

export const Route = createFileRoute("/agency-portal-entries")({ component: AgencyPortalEntriesPage });

function AgencyPortalEntriesPage() {
  return (
    <AgencyShell title="My Entries" subtitle="Patients your agency has submitted">
      <MyEntries />
    </AgencyShell>
  );
}
