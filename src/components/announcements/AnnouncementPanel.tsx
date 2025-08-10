import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

interface AnnouncementPanelProps {
  announcement: Announcement | null;
  isLoading: boolean;
}

export const AnnouncementPanel = ({ announcement, isLoading }: AnnouncementPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Megaphone className="mr-2 h-5 w-5" />
          Latest Announcement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
        ) : announcement ? (
          <p className="text-lg">{announcement.content}</p>
        ) : (
          <p className="text-muted-foreground">No announcements right now.</p>
        )}
      </CardContent>
    </Card>
  );
};