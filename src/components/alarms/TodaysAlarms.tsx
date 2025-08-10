import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export interface Alarm {
  id: string;
  name: string;
  time: string;
  is_active: boolean;
  days_of_week: number[] | null;
}

interface TodaysAlarmsProps {
  alarms: Alarm[];
}

export const TodaysAlarms = ({ alarms }: TodaysAlarmsProps) => {
  const currentDay = new Date().getDay();
  const todaysAlarms = alarms
    .filter(alarm => alarm.days_of_week?.includes(currentDay))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Bell className="mr-2 h-5 w-5" />
          Today's Alarms
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todaysAlarms.length > 0 ? (
          <ul className="space-y-2">
            {todaysAlarms.map((alarm) => (
              <li key={alarm.id} className="flex justify-between items-center text-sm">
                <span>{alarm.name}</span>
                <span className="font-mono font-semibold">{alarm.time}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No alarms scheduled for today.</p>
        )}
      </CardContent>
    </Card>
  );
};