import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory cache with date key
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

async function getWeather(city: string): Promise<{ temp: string; condition: string; humidity: string; icon: string } | null> {
  try {
    const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { "User-Agent": "ELARA-App" },
    });
    if (!resp.ok) { await resp.text(); return null; }
    const data = await resp.json();
    const current = data.current_condition?.[0];
    if (!current) return null;

    const tempC = parseInt(current.temp_C || "0");
    const desc = current.weatherDesc?.[0]?.value || "Clear";
    const humidity = current.humidity || "0";

    // Map to emoji
    const descLower = desc.toLowerCase();
    let icon = "☀️";
    if (descLower.includes("rain") || descLower.includes("drizzle")) icon = "🌧️";
    else if (descLower.includes("cloud") || descLower.includes("overcast")) icon = "☁️";
    else if (descLower.includes("snow")) icon = "❄️";
    else if (descLower.includes("thunder") || descLower.includes("storm")) icon = "⛈️";
    else if (descLower.includes("fog") || descLower.includes("mist")) icon = "🌫️";
    else if (descLower.includes("partly")) icon = "⛅";
    else if (tempC >= 40) icon = "🔥";
    else if (tempC >= 30) icon = "☀️";
    else if (tempC <= 5) icon = "🥶";

    return { temp: `${tempC}°C`, condition: desc, humidity: `${humidity}%`, icon };
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

function getTodayInfo(): { date: string; dayName: string; month: string; dayNum: number; monthNum: number } {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    date: now.toISOString().split("T")[0],
    dayName: days[now.getDay()],
    month: months[now.getMonth()],
    dayNum: now.getDate(),
    monthNum: now.getMonth(),
  };
}

function getSeasonalEvents(monthNum: number, dayNum: number, isKurdistan: boolean): string[] {
  const events: string[] = [];
  
  // March - Newroz (Kurdish New Year) & Mother's Day
  if (monthNum === 2) {
    if (dayNum <= 21) events.push("🌷 Newroz is coming! Kurdish New Year celebration");
    if (dayNum === 21) events.push("🔥 Happy Newroz! Kurdish New Year today!");
    if (dayNum === 21) events.push("💐 Mother's Day today!");
  }
  
  // Ramadan awareness (approximate - changes yearly)
  if (monthNum === 2 || monthNum === 3) {
    events.push("🌙 Ramadan season - stay hydrated & moisturize well during fasting");
  }
  
  // Summer tips
  if (monthNum >= 5 && monthNum <= 8) {
    events.push("☀️ Summer heat advisory - UV protection is essential");
    if (monthNum === 5 || monthNum === 6) events.push("🏖️ Summer season started - time for lightweight skincare");
  }
  
  // Winter tips
  if (monthNum >= 10 || monthNum <= 1) {
    if (isKurdistan) {
      events.push("❄️ Kurdistan winter - heavy moisturizing season");
    } else {
      events.push("🍂 Winter in Iraq - switch to richer moisturizers");
    }
  }

  // Spring
  if (monthNum === 2 || monthNum === 3) {
    events.push("🌸 Spring season - great time for exfoliation & renewal");
  }

  // International events
  if (monthNum === 2 && dayNum === 8) events.push("💜 International Women's Day!");
  if (monthNum === 1 && dayNum === 14) events.push("❤️ Valentine's Day - gift ideas available!");
  
  return events.slice(0, 3);
}

function generateSkincareTip(monthNum: number, isKurdistan: boolean, gender: string | null): string {
  const isMale = gender === "male";
  const tips: string[] = [];

  if (monthNum >= 5 && monthNum <= 8) {
    tips.push(
      isMale ? "Use a lightweight gel moisturizer + SPF 50 daily" : "Double cleanse at night to remove sunscreen & sweat buildup",
      "Vitamin C serum in the morning for sun damage protection",
      "Switch to water-based products to avoid clogged pores",
      isMale ? "Apply SPF even if you have a beard - UV penetrates facial hair" : "Use a hydrating mist throughout the day to combat dryness from AC",
    );
  } else if (monthNum >= 10 || monthNum <= 1) {
    tips.push(
      "Switch to a cream-based cleanser to prevent moisture loss",
      isMale ? "Use beard oil daily to prevent dry, flaky skin underneath" : "Apply hyaluronic acid serum on damp skin for max hydration",
      "Don't skip sunscreen even in winter - UV rays still damage skin",
      isKurdistan ? "The cold wind in Kurdistan can crack lips - use a lip balm with SPF" : "Indoor heating dries skin - use a humidifier if possible",
    );
  } else {
    tips.push(
      "Spring is perfect for introducing retinol into your routine",
      isMale ? "Exfoliate 2x/week to prevent ingrown hairs after shaving" : "Start your anti-aging routine now - prevention is key",
      "AHA/BHA exfoliants help with seasonal skin texture changes",
      "Transition to a lighter moisturizer as weather warms up",
    );
  }

  // Pick one based on day of month
  const dayIndex = new Date().getDate() % tips.length;
  return tips[dayIndex];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, language, gender, is_kurdistan } = await req.json();
    const weatherCity = city || (is_kurdistan ? "Erbil" : "Baghdad");
    const today = getTodayInfo();
    const cacheKey = `${today.date}-${weatherCity}-${language}-${gender}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch weather
    const weather = await getWeather(weatherCity);
    const events = getSeasonalEvents(today.monthNum, today.dayNum, !!is_kurdistan);
    const skincareTip = generateSkincareTip(today.monthNum, !!is_kurdistan, gender);

    // Build localized content
    let weatherText = "";
    let dateText = "";
    let tipLabel = "";
    let eventsLabel = "";

    if (language === "ar") {
      dateText = `${today.dayName} ${today.dayNum} ${today.month}`;
      tipLabel = "💡 نصيحة اليوم";
      eventsLabel = "📅 أحداث اليوم";
      if (weather) {
        weatherText = `${weather.icon} ${weather.temp} - ${weather.condition} في ${weatherCity}`;
      }
    } else if (language === "ku") {
      dateText = `${today.dayName} ${today.dayNum} ${today.month}`;
      tipLabel = "💡 ئامۆژگاری ئەمڕۆ";
      eventsLabel = "📅 ڕووداوەکانی ئەمڕۆ";
      if (weather) {
        weatherText = `${weather.icon} ${weather.temp} - ${weather.condition} لە ${weatherCity}`;
      }
    } else {
      dateText = `${today.dayName}, ${today.month} ${today.dayNum}`;
      tipLabel = "💡 Today's Tip";
      eventsLabel = "📅 What's Happening";
      if (weather) {
        weatherText = `${weather.icon} ${weather.temp} - ${weather.condition} in ${weatherCity}`;
      }
    }

    const brief = {
      date: dateText,
      weather: weather ? { text: weatherText, temp: weather.temp, condition: weather.condition, icon: weather.icon, humidity: weather.humidity } : null,
      tip: { label: tipLabel, text: skincareTip },
      events: events.length > 0 ? { label: eventsLabel, items: events } : null,
      city: weatherCity,
    };

    // Cache result
    cache.set(cacheKey, { data: brief, timestamp: Date.now() });

    return new Response(JSON.stringify(brief), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily brief error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate daily brief" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
