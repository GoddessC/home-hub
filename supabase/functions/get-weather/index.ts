import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NOTE: You will need to set these as environment variables in your Supabase project.
const GEOCODE_API_KEY = Deno.env.get("GEOCODE_API_KEY");
const NWS_USER_AGENT = Deno.env.get("NWS_USER_AGENT"); // e.g., "(My Awesome App, myemail@example.com)"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();
    if (!location) throw new Error("Location is required.");
    if (!GEOCODE_API_KEY) throw new Error("Geocoding API key is not configured.");
    if (!NWS_USER_AGENT) throw new Error("NWS User Agent is not configured.");

    // --- Step 1: Geocode the location to get lat/lon ---
    const geoUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(location)}&api_key=${GEOCODE_API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("Failed to geocode location.");
    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) throw new Error("Location not found.");
    
    const lat = parseFloat(geoData[0].lat).toFixed(4);
    const lon = parseFloat(geoData[0].lon).toFixed(4);

    // --- Step 2: Get the NWS gridpoint URL ---
    const pointsUrl = `https://api.weather.gov/points/${lat},${lon}`;
    const pointsResponse = await fetch(pointsUrl, {
      headers: { 'User-Agent': NWS_USER_AGENT },
    });
    if (!pointsResponse.ok) throw new Error("Failed to get NWS gridpoint.");
    const pointsData = await pointsResponse.json();
    const forecastUrl = pointsData.properties.forecast;

    // --- Step 3: Get the actual forecast ---
    const forecastResponse = await fetch(forecastUrl, {
      headers: { 'User-Agent': NWS_USER_AGENT },
    });
    if (!forecastResponse.ok) throw new Error("Failed to get NWS forecast.");
    const forecastData = await forecastResponse.json();
    
    const currentPeriod = forecastData.properties.periods[0];

    const weatherData = {
      temp: currentPeriod.temperature,
      description: currentPeriod.shortForecast,
      icon: currentPeriod.icon, // The NWS icon URL
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