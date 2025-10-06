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
  Wind,
  Thermometer,
  Moon,
} from 'lucide-react';

// Maps NWS shortForecast text (converted to lowercase) to Lucide icons
const getWeatherIcon = (forecast: string, isDaytime: boolean): React.ElementType => {
    const lowerForecast = forecast.toLowerCase();
    if (lowerForecast.includes('thunderstorm')) return CloudLightning;
    if (lowerForecast.includes('snow')) return CloudSnow;
    if (lowerForecast.includes('rain') || lowerForecast.includes('showers')) return CloudRain;
    if (lowerForecast.includes('windy') || lowerForecast.includes('breezy')) return Wind;
    if (lowerForecast.includes('fog') || lowerForecast.includes('haze')) return CloudFog;
    if (lowerForecast.includes('cloudy')) return Cloud;
    if (lowerForecast.includes('sunny') || lowerForecast.includes('clear')) {
        return isDaytime ? Sun : Moon;
    }
    if (lowerForecast.includes('partly cloudy') || lowerForecast.includes('mostly cloudy')) return Cloud;
    return Thermometer; // Default icon
};


export const WeatherIcon = () => {
  const { household } = useAuth();

  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather_data_nws', household?.id],
    queryFn: async () => {
      if (!household?.weather_location) return null;

      try {
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: { location: household.weather_location },
        });
        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error("Error fetching weather:", error);
        return null;
      }
    },
    enabled: !!household?.weather_location,
    staleTime: 1000 * 60 * 30, // Refetch every 30 minutes
    refetchOnWindowFocus: false,
  });

  if (!household?.weather_location) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-16 rounded-full" />;
  }

  if (!weather) {
    return null;
  }

  // NWS icon URLs contain '/day/' or '/night/'
  const isDaytime = weather.icon?.includes('/day/');
  const IconComponent = getWeatherIcon(weather.description, isDaytime);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <IconComponent className="mt-4 h-8 w-8" />
          <span className="text-xs">{weather.temp}° - Atlanta, GA</span>
          {/* <span className="text-xs">{weather.}</span> */}
          {/* <span>{weather.temp}° - {weather.description}</span> */}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="capitalize">{weather.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};