import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Clock, Timer, X } from 'lucide-react';
import { format } from 'date-fns';

export interface Alarm {
  id: string;
  name: string;
  time: string;
  is_active: boolean;
  days_of_week: number[] | null;
  sound: string;
  notes?: string;
  snooze_duration_minutes: number;
}

interface AlarmModalProps {
  alarm: Alarm | null;
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (alarmId: string, snoozeMinutes: number) => void;
  isSnoozeEnabled?: boolean;
}

export const AlarmModal = ({ alarm, isOpen, onClose, onSnooze, isSnoozeEnabled = true }: AlarmModalProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen || !alarm) return;

    setTimeElapsed(0);
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, alarm]);

  useEffect(() => {
    if (!isOpen || !alarm) return;

    // Play alarm sound based on alarm.sound setting
    const playAlarmSound = () => {
      if (alarm.sound === 'silent') return;
      
      const audio = new Audio('/ding.mp3'); // Using existing ding sound
      audio.loop = true;
      audio.play().catch(e => console.error("Could not play alarm sound:", e));
      
      return audio;
    };

    const audio = playAlarmSound();

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isOpen, alarm]);

  if (!alarm) return null;

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return format(date, 'h:mm a');
    } catch (e) {
      return timeStr;
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <Card className="border-2 border-red-500 shadow-2xl">
          <CardHeader className="text-center bg-red-50 dark:bg-red-950">
            <CardTitle className="flex items-center justify-center text-2xl text-red-600 dark:text-red-400">
              <Bell className="mr-2 h-8 w-8 animate-pulse" />
              ALARM
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary mb-2">{alarm.name}</h2>
              <p className="text-2xl font-mono text-muted-foreground mb-4">
                {formatTime(alarm.time)}
              </p>
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-4 w-4" />
                Ringing for {formatElapsedTime(timeElapsed)}
              </div>
            </div>

            {alarm.notes && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-sm whitespace-pre-line">{alarm.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              {isSnoozeEnabled && (
                <Button
                  onClick={() => {
                    console.log('Snooze button clicked');
                    onSnooze(alarm.id, 5); // Always use 5 minutes
                  }}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                  size="lg"
                >
                  <Timer className="mr-2 h-4 w-4" />
                  Snooze (5m)
                </Button>
              )}
              <Button
                onClick={() => {
                  console.log('Dismiss button clicked');
                  onClose();
                }}
                className={`${isSnoozeEnabled ? 'flex-1' : 'w-full'} bg-green-500 hover:bg-green-600 text-white`}
                size="lg"
              >
                <X className="mr-2 h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
