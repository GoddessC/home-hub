import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { PlusCircle, Trash2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

const subTaskSchema = z.object({
  description: z.string().min(3, 'Description is too short.'),
  member_id: z.string().uuid('You must assign a member.'),
});

const questSchema = z.object({
  name: z.string().min(3, 'Quest name is too short.'),
  reward_points_each: z.coerce.number().min(0, 'Reward must be 0 or more.'),
  sub_tasks: z.array(subTaskSchema).min(1, 'A quest must have at least one task.'),
});

type QuestFormValues = z.infer<typeof questSchema>;

export const QuestManagement = () => {
  const { household, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ['members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('members').select('*').eq('household_id', household.id);
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QuestFormValues>({
    resolver: zodResolver(questSchema),
    defaultValues: {
      name: '',
      reward_points_each: 10,
      sub_tasks: [{ description: '', member_id: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sub_tasks',
  });

  const addQuestMutation = useMutation({
    mutationFn: async (values: QuestFormValues) => {
      if (!household || !user) throw new Error("Not authorized");

      // Insert the main quest
      const { data: questData, error: questError } = await supabase
        .from('quests')
        .insert({
          household_id: household.id,
          created_by: user.id,
          name: values.name,
          reward_points_each: values.reward_points_each,
        })
        .select()
        .single();

      if (questError) throw questError;

      // Insert the sub-tasks
      const subTasksToInsert = values.sub_tasks.map(task => ({
        quest_id: questData.id,
        ...task,
      }));
      const { error: subTaskError } = await supabase.from('quest_sub_tasks').insert(subTasksToInsert);

      if (subTaskError) {
        // Clean up if sub-task insertion fails
        await supabase.from('quests').delete().eq('id', questData.id);
        throw subTaskError;
      }
    },
    onSuccess: () => {
      showSuccess('Team Quest launched!');
      queryClient.invalidateQueries({ queryKey: ['active_quest', household?.id] });
      reset();
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Quests</CardTitle>
        <CardDescription>Create collaborative goals for your household with a shared reward.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(data => addQuestMutation.mutate(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Quest Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Operation: Tidy Living Room" className={cn(errors.name && "border-destructive")} />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_points_each">Bonus Points (for each member)</Label>
              <Input id="reward_points_each" type="number" {...register('reward_points_each')} className={cn(errors.reward_points_each && "border-destructive")} />
              {errors.reward_points_each && <p className="text-red-500 text-sm">{errors.reward_points_each.message}</p>}
            </div>
          </div>

          <div>
            <Label>Sub-Tasks</Label>
            <div className="space-y-4 mt-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2 p-3 bg-secondary rounded-lg">
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      {...register(`sub_tasks.${index}.description`)}
                      placeholder={`Task #${index + 1}`}
                      className="bg-background"
                    />
                    <Controller
                      control={control}
                      name={`sub_tasks.${index}.member_id`}
                      render={({ field: controllerField }) => (
                        <Select onValueChange={controllerField.onChange} defaultValue={controllerField.value}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {members?.map(member => (
                              <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {errors.sub_tasks?.root && <p className="text-red-500 text-sm">{errors.sub_tasks.root.message}</p>}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ description: '', member_id: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          <Button type="submit" disabled={isSubmitting || addQuestMutation.isPending}>
            <Rocket className="h-4 w-4 mr-2" />
            {addQuestMutation.isPending ? 'Launching...' : 'Launch Quest'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};