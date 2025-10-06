import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { WeatherIcon } from './WeatherIcon';
import { AnalogClockComponent } from './AnalogClock';

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
          {/* Analog and Digital Clocks */}
          <div className="flex items-center justify-center gap-6">
            {/* Analog Clock */}
            <div className="flex items-center justify-center">
              <AnalogClockComponent
                size={120}
                accent="#0F172A"
                face="#FFFFFF"
                showSeconds={true}
                className="drop-shadow-md"
              />
            </div>
            {/* Digital Clock */}
            <div className="flex flex-col">
              <div className="text-3xl font-mono font-bold">
                {format(currentTime, 'h:mm:ss a')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentTime, 'EEEE, MMMM do')}
              </div>
              <WeatherIcon />
            </div>
          </div>
          {/* Weather under the clocks */}
          <div className="flex items-center justify-center">
            <div className="scale-150">
          
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
