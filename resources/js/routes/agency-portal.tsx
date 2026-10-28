import { createFileRoute } from "@tanstack/react-router";
import { AgencyShell } from "@/components/agency/agency-shell";
import { NewEntryForm } from "@/components/agency/new-entry-form";

export const Route = createFileRoute("/agency-portal")({ component: AgencyPortalPage });

function AgencyPortalPage() {
  return (
    <AgencyShell title="New Entry" subtitle="Register a patient for your agency">
      <div className="card-surface mx-auto max-w-2xl p-5 sm:p-6">
        <NewEntryForm />
      </div>
    </AgencyShell>
  );
}
