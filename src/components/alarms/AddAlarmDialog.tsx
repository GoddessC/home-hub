import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { showError } from "@/utils/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const daysOfWeek = [
  { id: '0', label: 'S' },
  { id: '1', label: 'M' },
  { id: '2', label: 'T' },
  { id: '3', label: 'W' },
  { id: '4', label: 'T' },
  { id: '5', label: 'F' },
  { id: '6', label: 'S' },
];

const alarmSchema = z.object({
  name: z.string().min(1, "Alarm name is required."),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)."),
  days_of_week: z.array(z.string()).min(1, "Please select at least one day.").transform(items => items.map(Number)),
});

export type AlarmFormValues = z.infer<typeof alarmSchema>;

interface AddAlarmDialogProps {
  onAddAlarm: (data: AlarmFormValues) => void;
  children: React.ReactNode;
}

export const AddAlarmDialog = ({ onAddAlarm, children }: AddAlarmDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlarmFormValues>({
    resolver: zodResolver(alarmSchema),
    defaultValues: {
      days_of_week: [],
    }
  });

  const onSubmit = (data: AlarmFormValues) => {
    try {
        onAddAlarm(data);
        reset();
        setIsOpen(false);
    } catch (error) {
        showError("An unexpected error occurred.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Alarm</DialogTitle>
          <DialogDescription>
            Set a name, time, and active days for the new alarm.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input id="name" {...field} className="col-span-3" placeholder="e.g., Wake-up" />}
            />
            {errors.name && <p className="col-span-4 text-red-500 text-sm text-right">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Time
            </Label>
            <Controller
              name="time"
              control={control}
              render={({ field }) => <Input id="time" type="time" {...field} className="col-span-3" />}
            />
            {errors.time && <p className="col-span-4 text-red-500 text-sm text-right">{errors.time.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Days
            </Label>
            <Controller
              name="days_of_week"
              control={control}
              render={({ field }) => (
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  className="col-span-3 justify-start"
                  value={field.value.map(String)}
                  onValueChange={field.onChange}
                >
                  {daysOfWeek.map(day => (
                    <ToggleGroupItem key={day.id} value={day.id} aria-label={`Toggle ${day.label}`}>
                      {day.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
            {errors.days_of_week && <p className="col-span-4 text-red-500 text-sm text-right">{errors.days_of_week.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">Add Alarm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};