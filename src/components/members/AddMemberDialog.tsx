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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

const addMemberSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  onAddMember: (data: AddMemberFormValues) => void;
  children: React.ReactNode;
}

export const AddMemberDialog = ({ onAddMember, children }: AddMemberDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
  });

  const onSubmit = (data: AddMemberFormValues) => {
    onAddMember(data);
    reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new member to your household. They won't have a login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="full_name" className="text-right">
              Full Name
            </Label>
            <Input id="full_name" {...register("full_name")} className="col-span-3" />
            {errors.full_name && <p className="col-span-4 text-red-500 text-sm text-right">{errors.full_name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>Add Member</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};