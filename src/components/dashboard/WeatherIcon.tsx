import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Thermometer,
} from 'lucide-react';

const weatherIconMap: { [key: string]: React.ElementType } = {
  '01d': Sun, // clear sky day
  '01n': Sun, // clear sky night (using Sun for simplicity)
  '02d': Cloud, // few clouds day
  '02n': Cloud, // few clouds night
  '03d': Cloud, // scattered clouds
  '03n': Cloud, // scattered clouds
  '04d': Cloud, // broken clouds
  '04n': Cloud, // broken clouds
  '09d': CloudDrizzle, // shower rain
  '09n': CloudDrizzle, // shower rain
  '10d': CloudRain, // rain day
  '10n': CloudRain, // rain night
  '11d': CloudLightning, // thunderstorm
  '11n': CloudLightning, // thunderstorm
  '13d': CloudSnow, // snow
  '13n': CloudSnow, // snow
  '50d': CloudFog, // mist
  '50n': CloudFog, // mist
};

export const WeatherIcon = () => {
  const { household } = useAuth();

  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather_data', household?.id],
    queryFn: async () => {
      if (!household?.weather_location) return null;

      try {
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: {
            location: household.weather_location,
            units: household.weather_units,
          },
        });
        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error("Error fetching weather:", error);
        return null;
      }
    },
    enabled: !!household?.weather_location,
    staleTime: 1000 * 60 * 15, // Refetch every 15 minutes
    refetchOnWindowFocus: false,
  });

  if (!household?.weather_location) {
    return null; // Don't show anything if location isn't set
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-16 rounded-full" />;
  }

  if (!weather) {
    return null; // Or show an error icon
  }

  const IconComponent = weatherIconMap[weather.icon] || Thermometer;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 font-semibold text-lg">
          <IconComponent className="h-6 w-6" />
          <span>{weather.temp}°</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="capitalize">{weather.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};