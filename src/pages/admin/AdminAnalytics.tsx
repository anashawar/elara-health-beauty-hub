import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Smartphone, Monitor, Globe, MapPin, Calendar, UserCheck, TrendingUp, Baby, UserCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";

const COLORS = ["#e879a0", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#14b8a6", "#f97316", "#ec4899"];

function getAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getAgeGroup(age: number | null): string {
  if (age === null) return "Unknown";
  if (age < 18) return "Under 18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  return "45+";
}

export default function AdminAnalytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "full_name" | "city" | "gender" | "age">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAllUsers, setShowAllUsers] = useState(false);

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
          .select("user_id, full_name, gender, birthdate, language, created_at, phone")
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
      const all: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("addresses")
          .select("user_id, city")
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

  // Fetch orders for activity
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-analytics-orders"],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("orders")
          .select("id, user_id, total, created_at, status")
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

  // Build user city map (first/default address city per user)
  const userCityMap = useMemo(() => {
    const map: Record<string, string> = {};
    addresses.forEach((a: any) => {
      if (!map[a.user_id]) map[a.user_id] = a.city;
    });
    return map;
  }, [addresses]);

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
      "Under 18": 0, "18-24": 0, "25-34": 0, "35-44": 0, "45+": 0, "Unknown": 0,
    };
    profiles.forEach((p: any) => {
      ageGroups[getAgeGroup(getAge(p.birthdate))]++;
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

    // Registration trend (monthly)
    const registrationMap: Record<string, number> = {};
    profiles.forEach((p: any) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      registrationMap[key] = (registrationMap[key] || 0) + 1;
    });
    const registrationData = Object.entries(registrationMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, users: count }));

    // Daily new users (last 30 days)
    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }
    profiles.forEach((p: any) => {
      const day = p.created_at?.split("T")[0];
      if (day && day in dailyMap) {
        dailyMap[day]++;
      }
    });
    const dailyNewUsers = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      users: count,
    }));

    // Users who ordered
    const orderingUsers = new Set(orders.map((o: any) => o.user_id));
    const conversionRate = totalUsers > 0 ? Math.round((orderingUsers.size / totalUsers) * 100) : 0;

    // New users today
    const todayStr = now.toISOString().split("T")[0];
    const newToday = profiles.filter((p: any) => p.created_at?.startsWith(todayStr)).length;

    // New users this month
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newThisMonth = registrationMap[thisMonth] || 0;

    // New users last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = profiles.filter((p: any) => new Date(p.created_at) >= weekAgo).length;

    return {
      totalUsers, genderData, ageData, cityData, languageData,
      registrationData, dailyNewUsers, conversionRate,
      orderingUsers: orderingUsers.size, newThisMonth, newThisWeek, newToday,
    };
  }, [profiles, addresses, orders]);

  // Detailed users list with sorting and search
  const usersList = useMemo(() => {
    const orderUserSet = new Set(orders.map((o: any) => o.user_id));

    let list = profiles.map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name || "—",
      gender: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "—",
      age: getAge(p.birthdate),
      city: userCityMap[p.user_id] || "—",
      created_at: p.created_at,
      has_ordered: orderUserSet.has(p.user_id),
      phone: p.phone || "—",
    }));

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.gender.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "full_name": cmp = a.full_name.localeCompare(b.full_name); break;
        case "city": cmp = a.city.localeCompare(b.city); break;
        case "gender": cmp = a.gender.localeCompare(b.gender); break;
        case "age": cmp = (a.age ?? 999) - (b.age ?? 999); break;
        case "created_at": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [profiles, userCityMap, orders, searchQuery, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  };

  const displayedUsers = showAllUsers ? usersList : usersList.slice(0, 50);

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
    { label: "New Today", value: stats.newToday, icon: Calendar, color: "text-amber-500" },
    { label: "New This Week", value: stats.newThisWeek, icon: TrendingUp, color: "text-emerald-500" },
    { label: "New This Month", value: stats.newThisMonth, icon: Calendar, color: "text-blue-500" },
    { label: "Ordered", value: stats.orderingUsers, icon: UserCheck, color: "text-purple-500" },
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-pink-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">App Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">User demographics, geography, and detailed user data</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily New Users Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Daily New Users (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyNewUsers} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row — Gender & Age */}
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

      {/* City & Registration */}
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
              <>
                <div className="h-52 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.cityData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {stats.cityData.slice(0, 10).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {stats.cityData.map((city, i) => (
                    <div key={city.name} className="flex items-center justify-between text-sm px-2 py-1 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground font-medium">{city.name}</span>
                      </div>
                      <span className="text-muted-foreground font-semibold">{city.value} users</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Registration Trend (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.registrationData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
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
            <div className="grid grid-cols-2 gap-3 py-2">
              {[
                { icon: Smartphone, label: "iOS App", status: "Live", color: "text-blue-500" },
                { icon: Smartphone, label: "Android", status: "Soon", color: "text-emerald-500" },
                { icon: Globe, label: "Web (PWA)", status: "Live", color: "text-purple-500" },
                { icon: Monitor, label: "Desktop", status: "Live", color: "text-orange-500" },
              ].map((p) => (
                <div key={p.label} className="p-3 rounded-xl bg-muted/50 text-center">
                  <p.icon className={`h-5 w-5 mx-auto ${p.color} mb-1`} />
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-lg font-bold text-foreground">{p.status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Users Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> All Users ({usersList.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, city, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("full_name")}>
                    Name <SortIcon field="full_name" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("city")}>
                    City <SortIcon field="city" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("gender")}>
                    Gender <SortIcon field="gender" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("age")}>
                    Age <SortIcon field="age" />
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    Joined <SortIcon field="created_at" />
                  </TableHead>
                  <TableHead>Ordered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((u, i) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-foreground text-sm max-w-[160px] truncate">{u.full_name}</TableCell>
                      <TableCell className="text-sm">{u.city}</TableCell>
                      <TableCell className="text-sm">{u.gender}</TableCell>
                      <TableCell className="text-sm">{u.age !== null ? u.age : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.phone}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        {u.has_ordered ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">Yes</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {usersList.length > 50 && !showAllUsers && (
            <div className="p-4 text-center border-t border-border/50">
              <button
                onClick={() => setShowAllUsers(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Show all {usersList.length} users
              </button>
            </div>
          )}
          {showAllUsers && usersList.length > 50 && (
            <div className="p-4 text-center border-t border-border/50">
              <button
                onClick={() => setShowAllUsers(false)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Show less
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
