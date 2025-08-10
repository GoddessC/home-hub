import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { Member } from "@/context/AuthContext";

export interface Chore {
  id: string;
  created_at: string;
  task: string;
  assigned_to: string;
  due_date: string | null;
  is_completed: boolean;
  points: number;
  members: Pick<Member, 'full_name' | 'avatar_url'> | null;
}

interface ChoreListProps {
  chores: Chore[];
  onUpdateChore: (id: string, updates: Partial<Chore>) => void;
  onDeleteChore: (id: string) => void;
  title?: string;
  showAdminControls?: boolean;
}

export const ChoreList = ({ chores, onUpdateChore, onDeleteChore, title = "Chore List", showAdminControls = false }: ChoreListProps) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' && showAdminControls;

  if (!chores || chores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No chores found. {isAdmin ? "Add a new chore to get started!" : "Looks like everything is done!"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {chores.map((chore) => (
            <li key={chore.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-4">
                <Checkbox
                  id={`chore-${chore.id}`}
                  checked={chore.is_completed}
                  onCheckedChange={(checked) => onUpdateChore(chore.id, { is_completed: !!checked })}
                />
                <div className="flex flex-col">
                  <label htmlFor={`chore-${chore.id}`} className="font-medium text-lg">{chore.task}</label>
                  <div className="text-sm text-muted-foreground space-x-2">
                    <span>Assigned to: {chore.members?.full_name || 'Unassigned'}</span>
                    {chore.due_date && <span>| Due: {format(new Date(chore.due_date), "PPP")}</span>}
                    <span>| Points: {chore.points}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {chore.is_completed ? (
                  <Badge variant="default">Completed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteChore(chore.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};