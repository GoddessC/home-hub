import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Profile } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface UserManagementListProps {
  profiles: Profile[];
  onDeleteUser: (userId: string) => void;
  currentUserId: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const UserManagementList = ({ profiles, onDeleteUser, currentUserId }: UserManagementListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Members</CardTitle>
        <CardDescription>Manage the members of your household.</CardDescription>
      </CardHeader>
      <CardContent>
        {profiles.length > 0 ? (
          <ul className="space-y-4">
            {profiles.map((profile) => (
              <li key={profile.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{profile.full_name}</span>
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>{profile.role}</Badge>
                  </div>
                </div>
                {profile.id !== currentUserId && profile.role !== 'admin' && (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteUser(profile.id)}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No users found in this household.</p>
        )}
      </CardContent>
    </Card>
  );
};