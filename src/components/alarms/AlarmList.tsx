import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, BellOff, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export interface Alarm {
  id: string;
  name: string;
  time: string;
  is_active: boolean;
}

interface AlarmListProps {
  alarms: Alarm[];
  onUpdateAlarm: (id: string, updates: Partial<Alarm>) => void;
  onDeleteAlarm: (id: string) => void;
}

export const AlarmList = ({ alarms, onUpdateAlarm, onDeleteAlarm }: AlarmListProps) => {
  if (!alarms || alarms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alarm List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No alarms have been set up yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alarm List</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {alarms.map((alarm) => (
            <li key={alarm.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-4">
                {alarm.is_active ? <Bell className="h-6 w-6 text-green-500" /> : <BellOff className="h-6 w-6 text-muted-foreground" />}
                <div>
                  <p className="font-medium text-lg">{alarm.name}</p>
                  <p className="text-2xl font-bold">{alarm.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={alarm.is_active}
                        onCheckedChange={(checked) => onUpdateAlarm(alarm.id, { is_active: checked })}
                    />
                    <Label htmlFor={`active-switch-${alarm.id}`}>{alarm.is_active ? "Active" : "Inactive"}</Label>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDeleteAlarm(alarm.id)}>
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};