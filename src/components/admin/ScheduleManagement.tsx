import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Clock, Save, Trash2, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { ScheduleTemplateManagement } from './ScheduleTemplateManagement';

type ScheduleItem = {
  id: string;
  time: string; // Keep for backward compatibility
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  is_template: boolean;
  household_id: string;
  created_at: string;
};

// Old ScheduleTemplate type removed - use new template system in ScheduleTemplateManagement

export const ScheduleManagement = () => {
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const [newItem, setNewItem] = useState({ time: '', start_time: '', end_time: '', title: '', description: '', is_template: false });
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Fetch today's schedule
  const { data: todaysSchedule, isLoading: isLoadingSchedule } = useQuery<ScheduleItem[]>({
    queryKey: ['schedule', household?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!household?.id) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('household_id', household.id)
        .eq('scheduled_date', today)
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  // Note: Old template system removed - use ScheduleTemplateManagement for new templates

  const addScheduleItemMutation = useMutation({
    mutationFn: async (item: { time: string; start_time: string; end_time: string; title: string; description: string; is_template: boolean }) => {
      if (!household) throw new Error("Household not found");
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase.from('schedule_items').insert({
        household_id: household.id,
        time: item.time, // Keep for backward compatibility
        start_time: item.start_time,
        end_time: item.end_time,
        title: item.title,
        description: item.description,
        scheduled_date: today,
        is_template: false,
      });
      if (error) throw error;

      // If marked as template, also save to templates
      if (item.is_template) {
        // Create a template with the item as a single template item
        const templateName = `${item.title} Template`;
        
        // First create the template
        const { data: templateData, error: templateError } = await supabase
          .from('schedule_templates')
          .insert({
            household_id: household.id,
            template_name: templateName,
            time: item.time, // Add the time column that the database expects
            title: item.title, // Add the title column that the database expects
            description: item.description || null,
            days_of_week: [], // Empty array - user can assign days later
            is_active: true,
          })
          .select()
          .single();
        
        if (templateError) throw templateError;

        // Then create the template item
        const { error: itemError } = await supabase
          .from('schedule_template_items')
          .insert({
            template_id: templateData.id,
            time: item.time, // Keep for backward compatibility
            start_time: item.start_time,
            end_time: item.end_time,
            title: item.title,
            description: item.description,
            sort_order: 0,
          });
        
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      showSuccess('Schedule item added!');
      queryClient.invalidateQueries({ queryKey: ['schedule', household?.id] });
      queryClient.invalidateQueries({ queryKey: ['schedule_templates_full', household?.id] });
      setNewItem({ time: '', start_time: '', end_time: '', title: '', description: '', is_template: false });
    },
    onError: (error: Error) => showError(error.message),
  });

  // Old template system removed - use ScheduleTemplateManagement for new templates

  const updateScheduleItemMutation = useMutation({
    mutationFn: async ({ id, time, start_time, end_time, title, description }: { id: string; time: string; start_time: string; end_time: string; title: string; description: string }) => {
      const { error } = await supabase
        .from('schedule_items')
        .update({ time, start_time, end_time, title, description })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Schedule item updated!');
      queryClient.invalidateQueries({ queryKey: ['schedule', household?.id] });
      setEditingItem(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteScheduleItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('schedule_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Schedule item deleted.');
      queryClient.invalidateQueries({ queryKey: ['schedule', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  // Old template system removed - use ScheduleTemplateManagement for new templates

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.start_time || !newItem.end_time || !newItem.title) return;
    
    // Set time field for backward compatibility (use start_time)
    const itemWithTime = {
      ...newItem,
      time: newItem.start_time
    };
    
    addScheduleItemMutation.mutate(itemWithTime);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.start_time || !editingItem.end_time || !editingItem.title) return;
    updateScheduleItemMutation.mutate({
      id: editingItem.id,
      time: editingItem.start_time, // Use start_time for backward compatibility
      start_time: editingItem.start_time,
      end_time: editingItem.end_time,
      title: editingItem.title,
      description: editingItem.description || '',
    });
  };

  return (
    <>
      {/* Schedule Template Management */}
      {/* <ScheduleTemplateManagement /> */}

      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Daily Schedule</CardTitle>
              <CardDescription>Manage today's schedule and reusable templates.</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Add new schedule item */}
              <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Add Schedule Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newItem.start_time}
                      onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newItem.end_time}
                      onChange={(e) => setNewItem({ ...newItem, end_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="e.g., Morning Meeting"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={addScheduleItemMutation.isPending}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Additional details..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_template"
                    checked={newItem.is_template}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, is_template: !!checked })}
                  />
                  <Label htmlFor="is_template" className="text-sm">
                    Save as reusable template
                  </Label>
                </div>
              </form>

              {/* Today's Schedule */}
              <div>
                <h4 className="font-medium mb-3">Today's Schedule</h4>
                {isLoadingSchedule ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : todaysSchedule && todaysSchedule.length > 0 ? (
                  <div className="space-y-2">
                    {todaysSchedule.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{item.time} - {item.title}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteScheduleItemMutation.mutate(item.id)}
                            disabled={deleteScheduleItemMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No schedule items for today.</p>
                )}
              </div>

              {/* Note: Template functionality moved to ScheduleTemplateManagement component */}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Edit Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Schedule Item</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editingItem.start_time || editingItem.time}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      start_time: e.target.value,
                      time: e.target.value // Sync for backward compatibility
                    })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editingItem.end_time || editingItem.time}
                    onChange={(e) => setEditingItem({ ...editingItem, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateScheduleItemMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
