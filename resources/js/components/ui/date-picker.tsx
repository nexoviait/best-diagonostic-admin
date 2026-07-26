import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function parseCustomDateInput(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Replace dots, slashes, hyphens, spaces with a single delimiter '-'
  const normalized = trimmed.replace(/[\/\.\s]+/g, "-");
  const parts = normalized.split("-").filter(Boolean);

  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (isNaN(p1) || isNaN(p2) || isNaN(year)) return null;

    // Handle 2-digit year (e.g. 26 -> 2026, 82 -> 1982)
    if (year < 100) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const shortCurrentYear = currentYear % 100;
      if (year <= shortCurrentYear + 5) {
        year = currentCentury + year;
      } else {
        year = currentCentury - 100 + year;
      }
    }

    let day = p1;
    let month = p2;

    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // If YYYY-MM-DD
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  // Convert standard date string YYYY-MM-DD to local Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const formattedDisplay = React.useMemo(() => {
    if (dateValue) return format(dateValue, "dd MMM, yyyy");
    return "";
  }, [dateValue]);

  // Sync inputText when value changes externally and not editing
  React.useEffect(() => {
    if (!isEditing) {
      setInputText(formattedDisplay);
    }
  }, [formattedDisplay, isEditing]);

  const commitInput = (text: string) => {
    if (!text.trim()) {
      onChange("");
      return;
    }
    const parsed = parseCustomDateInput(text);
    if (parsed) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    } else if (dateValue) {
      setInputText(formattedDisplay);
    }
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
    setOpen(false);
    setIsEditing(false);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={isEditing ? inputText : formattedDisplay}
        onFocus={() => {
          setIsEditing(true);
          setInputText(value || formattedDisplay);
        }}
        onChange={(e) => {
          setInputText(e.target.value);
        }}
        onBlur={() => {
          setIsEditing(false);
          commitInput(inputText);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsEditing(false);
            commitInput(inputText);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="pr-9 h-9 text-sm"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
