import { createFileRoute } from "@tanstack/react-router";
import { MedicalReportForm } from "@/components/medical-report-form";

export const Route = createFileRoute("/report-entry")({
  component: ReportEntryRoute,
});

function ReportEntryRoute() {
  return <MedicalReportForm mode="general" />;
}
