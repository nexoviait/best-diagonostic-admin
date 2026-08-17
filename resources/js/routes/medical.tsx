import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/medical")({
  component: MedicalSearchPage,
});

function MedicalSearchPage() {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    navigate({
      to: "/search-passport",
      search: { PassportNo: searchValue.trim() },
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#cccccc] px-4">
      <div className="w-full max-w-[500px] rounded border border-gray-300 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-800 uppercase">
          Check Online Medical Certificate
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="search-value" className="whitespace-nowrap text-xs font-semibold text-gray-700">
              Passport No :
            </Label>
            <Input
              id="search-value"
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
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
