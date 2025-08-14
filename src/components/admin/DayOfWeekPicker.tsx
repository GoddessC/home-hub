import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "../ui/button";

const days = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

interface DayOfWeekPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export const DayOfWeekPicker = ({ value, onChange }: DayOfWeekPickerProps) => {
  const stringValues = value.map(String);

  const handleValueChange = (newStringValues: string[]) => {
    onChange(newStringValues.map(Number));
  };

  return (
    <div className="space-y-2">
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={stringValues}
        onValueChange={handleValueChange}
        className="justify-start"
      >
        {days.map((day) => (
          <ToggleGroupItem key={day.value} value={String(day.value)} aria-label={`Toggle ${day.label}`}>
            {day.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex gap-2">
        <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => onChange([])}>None</Button>
        <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => onChange([1, 2, 3, 4, 5])}>Weekdays</Button>
        <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}>Every Day</Button>
      </div>
    </div>
  );
};