import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Member } from "@/context/AuthContext";
import { Trophy } from "lucide-react";

interface MemberPointsListProps {
  members: Member[];
}

export const MemberPointsList = ({ members }: MemberPointsListProps) => {
  const sortedMembers = [...members].sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Points</CardTitle>
        <CardDescription>Who's leading the charge this week?</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedMembers.length > 0 ? (
          <ul className="space-y-4">
            {sortedMembers.map((member, index) => (
              <li key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                  <span className="font-medium">{member.full_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-primary">{member.points || 0}</span>
                  <Trophy className={`h-5 w-5 ${index === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No members found.</p>
        )}
      </CardContent>
    </Card>
  );
};