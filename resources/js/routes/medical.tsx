import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/medical")({
  component: MedicalSearchPage,
});

function MedicalSearchPage() {
  const [passportNo, setPassportNo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passportNo.trim()) return;
    navigate({
      to: "/search-passport",
      search: { PassportNo: passportNo.trim() },
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#cccccc] px-4">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <div className="w-full max-w-[500px] rounded border border-gray-300 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-800 uppercase">
          Check Online Medical Certificate
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="passport" className="whitespace-nowrap text-xs font-semibold text-gray-700">
              Passport No :
            </Label>
            <Input
              id="passport"
              type="text"
              value={passportNo}
              onChange={(e) => setPassportNo(e.target.value)}
              className="h-8 w-48 rounded border border-gray-400 px-2 text-xs focus-visible:ring-1"
              required
            />
          </div>
          <div className="text-center text-xs italic text-gray-500">
            Example: AA34534656
          </div>
          <div className="flex justify-center gap-3">
            <Button
              type="submit"
              className="h-8 bg-[#0d9488] px-6 text-xs font-semibold text-white hover:bg-[#0b7a70]"
            >
              Search
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
