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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Member } from "@/context/AuthContext";
import { useState } from "react";

const choreSchema = z.object({
  task: z.string().min(1, "Task description is required."),
  assigned_to: z.string().uuid("Please select a member."),
  due_date: z.date().optional(),
  points: z.coerce.number().min(1, "Points must be at least 1.").default(1),
});

export type ChoreFormValues = z.infer<typeof choreSchema>;

interface AddChoreDialogProps {
  members: Member[];
  onAddChore: (data: ChoreFormValues) => void;
  children: React.ReactNode;
}

export const AddChoreDialog = ({ members, onAddChore, children }: AddChoreDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<ChoreFormValues>({
    resolver: zodResolver(choreSchema),
  });

  const onSubmit = (data: ChoreFormValues) => {
    onAddChore(data);
    reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Chore</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new chore for a family member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task" className="text-right">
              Task
            </Label>
            <Controller
              name="task"
              control={control}
              render={({ field }) => <Input id="task" {...field} className="col-span-3" />}
            />
            {errors.task && <p className="col-span-4 text-red-500 text-sm text-right">{errors.task.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assigned_to" className="text-right">
              Assign to
            </Label>
            <Controller
              name="assigned_to"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
             {errors.assigned_to && <p className="col-span-4 text-red-500 text-sm text-right">{errors.assigned_to.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="due_date" className="text-right">
              Due Date
            </Label>
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              Points
            </Label>
            <Input id="points" type="number" {...register("points")} className="col-span-3" defaultValue={1} />
            {errors.points && <p className="col-span-4 text-red-500 text-sm text-right">{errors.points.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">Add Chore</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};