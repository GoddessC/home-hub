import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NOTE: The OPENWEATHER_API_KEY must be set as an environment variable in your Supabase project settings.
const API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, units } = await req.json();
    if (!location) {
      throw new Error("Location is required.");
    }
    if (!API_KEY) {
        throw new Error("OpenWeather API key is not configured.");
    }

    const params = new URLSearchParams({
      q: location,
      units: units || 'imperial',
      appid: API_KEY,
    });

    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // We only need a small subset of the data, so let's trim it down.
    const weatherData = {
        temp: Math.round(data.main.temp),
        main: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
    };

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});