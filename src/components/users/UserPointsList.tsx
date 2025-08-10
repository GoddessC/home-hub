import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Profile } from "@/context/AuthContext";
import { Award } from "lucide-react";

interface UserPointsListProps {
  profiles: Profile[];
}

export const UserPointsList = ({ profiles }: UserPointsListProps) => {
  const sortedProfiles = [...profiles].sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Points Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedProfiles.length > 0 ? (
          <ul className="space-y-4">
            {sortedProfiles.map((profile, index) => (
              <li key={profile.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                  <span className="font-medium">{profile.full_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-primary">{profile.points || 0}</span>
                  <Award className="h-5 w-5 text-yellow-500" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No users found.</p>
        )}
      </CardContent>
    </Card>
  );
};