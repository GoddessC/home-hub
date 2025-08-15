import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Member } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface MemberManagementListProps {
  // FIX: Added 'avatar_url' to the Member type to match the data structure.
  members: (Member & { avatar_url?: string | null })[];
  onDeleteMember: (memberId: string) => void;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const MemberManagementList = ({ members, onDeleteMember }: MemberManagementListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Members</CardTitle>
        <CardDescription>Manage the members of your household.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <ul className="space-y-4">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.full_name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDeleteMember(member.id)}>
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No members found. Add one to get started!</p>
        )}
      </CardContent>
    </Card>
  );
};