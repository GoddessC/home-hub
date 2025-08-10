import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

const announcementSchema = z.object({
  content: z.string().min(1, "Announcement cannot be empty.").max(500, "Announcement is too long."),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

interface AnnouncementManagementProps {
  announcements: Announcement[];
  onAddAnnouncement: (data: AnnouncementFormValues) => void;
  onDeleteAnnouncement: (id: string) => void;
  isLoading: boolean;
  isSubmitting: boolean;
}

export const AnnouncementManagement = ({ announcements, onAddAnnouncement, onDeleteAnnouncement, isLoading, isSubmitting }: AnnouncementManagementProps) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
  });

  const onSubmit = (data: AnnouncementFormValues) => {
    onAddAnnouncement(data);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcement Management</CardTitle>
        <CardDescription>Post, view, and delete household announcements. The most recent one will be shown on the dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Textarea
            placeholder="Type your announcement here..."
            {...register('content')}
            className="min-h-[100px]"
          />
          {errors.content && <p className="text-red-500 text-sm">{errors.content.message}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Announcement'}
          </Button>
        </form>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">History</h3>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : announcements.length > 0 ? (
            <ul className="space-y-3">
              {announcements.map(announcement => (
                <li key={announcement.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex flex-col">
                    <p className="text-sm">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground">
                      Posted {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteAnnouncement(announcement.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No past announcements.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};