import { createFileRoute } from "@tanstack/react-router";
import { MedicalReportForm } from "@/components/medical-report-form";

export const Route = createFileRoute("/malaysia-report")({
  component: MalaysiaReportRoute,
});

function MalaysiaReportRoute() {
  return <MedicalReportForm mode="malaysia" />;
}
