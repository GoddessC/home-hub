import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Member } from "@/context/AuthContext";
import { Award } from "lucide-react";

interface YearlyMemberPointsListProps {
  members: Member[];
}

export const YearlyMemberPointsList = ({ members }: YearlyMemberPointsListProps) => {
  const sortedMembers = [...members].sort((a, b) => (b.yearly_points || 0) - (a.yearly_points || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Points Leaderboard</CardTitle>
        <CardDescription>A running total of all points earned this year.</CardDescription>
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
                  <span className="font-bold text-lg text-primary">{member.yearly_points || 0}</span>
                  <Award className="h-5 w-5 text-yellow-500" />
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