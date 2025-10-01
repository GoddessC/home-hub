import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { WeatherIcon } from './WeatherIcon';

interface ClockWeatherPanelProps {
  className?: string;
}

export const ClockWeatherPanel = ({ className }: ClockWeatherPanelProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold mb-2">
            {format(currentTime, 'h:mm:ss a')}
          </div>
          <div className="text-xl text-muted-foreground mb-4">
            {format(currentTime, 'EEEE, MMMM do, yyyy')}
          </div>
          {/* Weather under the clock */}
          <div className="flex items-center justify-center">
            <div className="scale-150">
              <WeatherIcon />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
