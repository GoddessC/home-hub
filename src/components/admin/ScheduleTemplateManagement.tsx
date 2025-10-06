import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Clock, Edit, Trash2, Calendar, Play } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ScheduleTemplateForm, ScheduleTemplateFormValues } from './ScheduleTemplateForm';
import { format } from 'date-fns';

type ScheduleTemplateItem = {
  id: string;
  time: string; // Keep for backward compatibility
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  sort_order: number;
};

type ScheduleTemplate = {
  id: string;
  template_name: string;
  description?: string;
  days_of_week: number[];
  is_active: boolean;
  household_id: string;
  created_at: string;
  updated_at: string;
  items: ScheduleTemplateItem[];
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduleTemplateManagement = () => {
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);

  // Fetch schedule templates with their items
  const { data: templates, isLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: ['schedule_templates_full', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      
      const { data: templatesData, error: templatesError } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('household_id', household.id)
        .order('template_name');
      
      if (templatesError) throw templatesError;
      if (!templatesData) return [];

      // Fetch items for each template
      const templatesWithItems = await Promise.all(
        templatesData.map(async (template) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('schedule_template_items')
            .select('*')
            .eq('template_id', template.id)
            .order('sort_order, time');

          if (itemsError) throw itemsError;

          return {
            ...template,
            items: itemsData || [],
          };
        })
      );

      return templatesWithItems;
    },
    enabled: !!household?.id,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: ScheduleTemplateFormValues) => {
      if (!household) throw new Error("Household not found");

      // Ensure template_name is not empty or just whitespace
      const trimmedTemplateName = data.template_name?.trim();
      
      if (!trimmedTemplateName || trimmedTemplateName.length === 0) {
        throw new Error("Template name cannot be empty");
      }

      // Create the template
      const { data: templateData, error: templateError } = await supabase
        .from('schedule_templates')
        .insert({
          household_id: household.id,
          template_name: trimmedTemplateName,
          time: data.items[0]?.time || '', // Use first item's time for backward compatibility
          title: data.items[0]?.title || '', // Use first item's title for backward compatibility
          description: data.description?.trim() || null,
          days_of_week: data.days_of_week,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create the template items
      const itemsToInsert = data.items.map((item, index) => ({
        template_id: templateData.id,
        time: item.time, // Keep for backward compatibility
        start_time: item.start_time,
        end_time: item.end_time,
        title: item.title,
        description: item.description,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('schedule_template_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      showSuccess('Schedule template created!');
      queryClient.invalidateQueries({ queryKey: ['schedule_templates_full', household?.id] });
      setIsCreating(false);
    },
    onError: (error: Error) => showError(error.message),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScheduleTemplateFormValues }) => {
      // Ensure template_name is not empty or just whitespace
      const trimmedTemplateName = data.template_name?.trim();
      if (!trimmedTemplateName || trimmedTemplateName.length === 0) {
        throw new Error("Template name cannot be empty");
      }

      // Update the template
      const { error: templateError } = await supabase
        .from('schedule_templates')
        .update({
          template_name: trimmedTemplateName,
          time: data.items[0]?.time || '', // Use first item's time for backward compatibility
          title: data.items[0]?.title || '', // Use first item's title for backward compatibility
          description: data.description?.trim() || null,
          days_of_week: data.days_of_week,
        })
        .eq('id', id);

      if (templateError) throw templateError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('schedule_template_items')
        .delete()
        .eq('template_id', id);

      if (deleteError) throw deleteError;

      // Insert new items
      const itemsToInsert = data.items.map((item, index) => ({
        template_id: id,
        time: item.time, // Keep for backward compatibility
        start_time: item.start_time,
        end_time: item.end_time,
        title: item.title,
        description: item.description,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('schedule_template_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      showSuccess('Schedule template updated!');
      queryClient.invalidateQueries({ queryKey: ['schedule_templates_full', household?.id] });
      setEditingTemplate(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('schedule_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Schedule template deleted.');
      queryClient.invalidateQueries({ queryKey: ['schedule_templates_full', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const generateScheduleMutation = useMutation({
    mutationFn: async ({ templateId, startDate, endDate }: { templateId: string; startDate: string; endDate: string }) => {
      if (!household) throw new Error("Household not found");

      const { error } = await supabase.rpc('generate_schedule_for_date_range', {
        start_date: startDate,
        end_date: endDate,
        target_household_id: household.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Schedule generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['schedule', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleCreate = (data: ScheduleTemplateFormValues) => {
    createTemplateMutation.mutate(data);
  };

  const handleUpdate = (data: ScheduleTemplateFormValues) => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({ id: editingTemplate.id, data });
  };

  const handleGenerateSchedule = (templateId: string) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    generateScheduleMutation.mutate({
      templateId,
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(nextWeek, 'yyyy-MM-dd'),
    });
  };

  const getDayNames = (days: number[]) => {
    return days.map(day => dayNames[day]).join(', ');
  };

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Schedule Template</CardTitle>
          <CardDescription>Create a new schedule template that can be assigned to specific days of the week.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleTemplateForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            isSubmitting={createTemplateMutation.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  if (editingTemplate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Schedule Template</CardTitle>
          <CardDescription>Modify the schedule template and its assigned days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleTemplateForm
            onSubmit={handleUpdate}
            onCancel={() => setEditingTemplate(null)}
            defaultValues={{
              template_name: editingTemplate.template_name,
              description: editingTemplate.description,
              days_of_week: editingTemplate.days_of_week,
              items: editingTemplate.items.map(item => ({
                time: item.time, // Keep for backward compatibility
                start_time: item.start_time || item.time,
                end_time: item.end_time || item.time,
                title: item.title,
                description: item.description || '',
              })),
            }}
            isSubmitting={updateTemplateMutation.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible defaultOpen>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Schedule Templates</CardTitle>
            <CardDescription>Manage complete schedule templates and assign them to specific days of the week.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Template
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-4">
                {templates.map(template => (
                  <div key={template.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{template.template_name}</h3>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Assigned to: {getDayNames(template.days_of_week)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSchedule(template.id)}
                          disabled={generateScheduleMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          disabled={deleteTemplateMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Schedule Items:</h4>
                      <div className="space-y-1">
                        {template.items.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{item.time}</span>
                            <span>-</span>
                            <span>{item.title}</span>
                            {item.description && (
                              <span className="text-muted-foreground">({item.description})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Schedule Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first schedule template to get started.
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
