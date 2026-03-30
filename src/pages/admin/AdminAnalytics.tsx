import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Smartphone, Monitor, Globe, MapPin, Calendar, UserCheck, TrendingUp, Baby, UserCircle } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["#e879a0", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#14b8a6", "#f97316", "#ec4899"];

export default function AdminAnalytics() {
  // Fetch all profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-analytics-profiles"],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, gender, birthdate, language, created_at")
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return all;
    },
  });

  // Fetch addresses for city data
  const { data: addresses = [] } = useQuery({
    queryKey: ["admin-analytics-addresses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("user_id, city");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch orders for activity
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, user_id, total, created_at, status");
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const totalUsers = profiles.length;

    // Gender breakdown
    const genderMap: Record<string, number> = {};
    profiles.forEach((p: any) => {
      const g = p.gender || "Unknown";
      genderMap[g] = (genderMap[g] || 0) + 1;
    });
    const genderData = Object.entries(genderMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // Age breakdown
    const ageGroups: Record<string, number> = {
      "Under 18": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45+": 0,
      "Unknown": 0,
    };
    profiles.forEach((p: any) => {
      if (!p.birthdate) {
        ageGroups["Unknown"]++;
        return;
      }
      const birth = new Date(p.birthdate);
      const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) ageGroups["Under 18"]++;
      else if (age <= 24) ageGroups["18-24"]++;
      else if (age <= 34) ageGroups["25-34"]++;
      else if (age <= 44) ageGroups["35-44"]++;
      else ageGroups["45+"]++;
    });
    const ageData = Object.entries(ageGroups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    // City breakdown (unique users per city)
    const cityUserMap: Record<string, Set<string>> = {};
    addresses.forEach((a: any) => {
      if (!cityUserMap[a.city]) cityUserMap[a.city] = new Set();
      cityUserMap[a.city].add(a.user_id);
    });
    const cityData = Object.entries(cityUserMap)
      .map(([name, users]) => ({ name, value: users.size }))
      .sort((a, b) => b.value - a.value);

    // Language breakdown
    const langMap: Record<string, number> = {};
    profiles.forEach((p: any) => {
      const l = p.language || "en";
      const label = l === "en" ? "English" : l === "ar" ? "Arabic" : l === "ku" ? "Kurdish" : l;
      langMap[label] = (langMap[label] || 0) + 1;
    });
    const languageData = Object.entries(langMap).map(([name, value]) => ({ name, value }));

    // Registration trend (by week for last 3 months, by month otherwise)
    const registrationMap: Record<string, number> = {};
    profiles.forEach((p: any) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      registrationMap[key] = (registrationMap[key] || 0) + 1;
    });
    const registrationData = Object.entries(registrationMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, users: count }));

    // Users who ordered
    const orderingUsers = new Set(orders.map((o: any) => o.user_id));
    const conversionRate = totalUsers > 0 ? Math.round((orderingUsers.size / totalUsers) * 100) : 0;

    // New users this month
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newThisMonth = registrationMap[thisMonth] || 0;

    // New users last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = profiles.filter((p: any) => new Date(p.created_at) >= weekAgo).length;

    return {
      totalUsers,
      genderData,
      ageData,
      cityData,
      languageData,
      registrationData,
      conversionRate,
      orderingUsers: orderingUsers.size,
      newThisMonth,
      newThisWeek,
    };
  }, [profiles, addresses, orders]);

  if (loadingProfiles) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "New This Week", value: stats.newThisWeek, icon: TrendingUp, color: "text-emerald-500" },
    { label: "New This Month", value: stats.newThisMonth, icon: Calendar, color: "text-blue-500" },
    { label: "Ordered (Conversion)", value: `${stats.orderingUsers} (${stats.conversionRate}%)`, icon: UserCheck, color: "text-purple-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">App Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">User demographics, geography, and platform insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 — Gender & Age */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-pink-500" /> Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.genderData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.genderData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {stats.genderData.map((g, i) => (
                <div key={g.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{g.name}: <span className="font-semibold text-foreground">{g.value}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Baby className="h-4 w-4 text-blue-500" /> Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 — City & Registration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" /> Users by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.cityData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No address data available yet</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {stats.cityData.map((city, i) => {
                  const maxVal = stats.cityData[0]?.value || 1;
                  const pct = Math.round((city.value / maxVal) * 100);
                  return (
                    <div key={city.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-24 truncate text-foreground">{city.name}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground w-8 text-right">{city.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.registrationData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language & Platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-500" /> Language Preference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.languageData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.languageData.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-orange-500" /> Platform Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Platform tracking (iOS, Android, Web, Desktop) requires analytics integration. Current data is based on user registrations and demographics.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <Smartphone className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">iOS App</p>
                  <p className="text-lg font-bold text-foreground">Live</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <Smartphone className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Android</p>
                  <p className="text-lg font-bold text-foreground">Soon</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <Globe className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Web (PWA)</p>
                  <p className="text-lg font-bold text-foreground">Live</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <Monitor className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Desktop</p>
                  <p className="text-lg font-bold text-foreground">Live</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Registered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.orderingUsers}</p>
              <p className="text-xs text-muted-foreground">Have Ordered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.cityData.length}</p>
              <p className="text-xs text-muted-foreground">Cities Reached</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
