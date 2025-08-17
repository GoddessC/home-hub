import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Member } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { MemberAvatar } from "../avatar/MemberAvatar";

interface MemberManagementListProps {
  members: Member[];
  onDeleteMember: (memberId: string) => void;
}

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
                  <MemberAvatar memberId={member.id} className="w-12 h-16" />
                  <span className="font-medium">{member.full_name}</span>
                </div>
                {member.role !== 'OWNER' && (
                    <Button variant="ghost" size="icon" onClick={() => onDeleteMember(member.id)}>
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                )}
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