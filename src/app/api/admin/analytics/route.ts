import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Note: Use Service Role Key for Admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get("date"); // YYYY-MM-DD format

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Verify Admin Status
    const token = authHeader.split(" ")[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, roles")
      .eq("id", user.id)
      .single();

    const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role].filter(r => r != null);
    if (!roles.includes(1)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Fetch All Historical Daily Visits using recursive pagination to bypass 1000 row configuration limit
    let visitsData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    const maxPages = 50; // Safety circuit breaker (50,000 rows cap)

    while (hasMore && page < maxPages) {
      const { data, error: visitError } = await supabase
        .from("user_visits")
        .select("visit_date, visited_at, user_id")
        .order("visit_date", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (visitError) {
        console.error("Visit Fetch Error:", visitError);
        throw visitError;
      }

      if (data && data.length > 0) {
        visitsData = [...visitsData, ...data];
      }

      if (!data || data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // 3. Fetch Profiles for those users to get names/emails (Chunked to bypass limits)
    const userIds = Array.from(new Set(visitsData.map(v => v.user_id)));
    let profilesData: any[] = [];
    const profileChunkSize = 1000;
    
    for (let i = 0; i < userIds.length; i += profileChunkSize) {
      const chunk = userIds.slice(i, i + profileChunkSize);
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, temple, role")
        .in("id", chunk);

      if (profileError) {
        console.error("Profile Fetch Error (Non-fatal):", profileError);
      } else if (data) {
        profilesData = [...profilesData, ...data];
      }
    }

    // Map profiles for quick lookup
    const profileMap: Record<string, any> = {};
    profilesData.forEach(p => { profileMap[p.id] = p; });

    // 4. Process Aggregate Data
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    
    // Grouping by Date
    const dailyCounts: Record<string, number> = {};
    const visitorsToday: any[] = [];
    
    // Process unique visits
    (visitsData || []).forEach((v: any) => {
      const date = v.visit_date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      
      const p = profileMap[v.user_id];
      if (date === todayStr) {
        visitorsToday.push({ 
          id: v.user_id,
          name: p?.full_name || (p?.email ? p.email.split('@')[0] : "Guest"),
          email: p?.email || "Confidential",
          time: v.visited_at 
        });
      }
    });

    // 5. Case: Fetch specific user list for a date (Deep-dive)
    if (targetDate) {
      const usersForDate = (visitsData || [])
        .filter((v: any) => v.visit_date === targetDate)
        .map((v: any) => {
          const p = profileMap[v.user_id] || {};
          return {
            id: v.user_id,
            name: p.full_name || (p.email ? p.email.split('@')[0] : "Guest"),
            email: p.email || "Confidential",
            temple: p.temple || "Unknown",
            role: p.role || 6,
            time: v.visited_at
          };
        });

      return NextResponse.json({ users: usersForDate });
    }

    // 5. Generate Summary Results
    const history = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // Last 30 active days

    const totalActiveDays = Object.keys(dailyCounts).length;
    const totalUniqueDailyVisitsAcrossHistory = (visitsData || []).length;
    
    // Compute Busiest Day
    let busiestDay = "None";
    let busiestCount = 0;
    Object.entries(dailyCounts).forEach(([date, count]) => {
      if (count > busiestCount) {
        busiestCount = count;
        busiestDay = date;
      }
    });

    return NextResponse.json({
      stats: {
        totalDaysActive: totalActiveDays,
        visitorsInView: totalUniqueDailyVisitsAcrossHistory,
        avgVisitorsPerDay: totalActiveDays > 0 ? (totalUniqueDailyVisitsAcrossHistory / totalActiveDays).toFixed(1) : "0",
        busiestDay,
        busiestCount
      },
      history,
      todayList: visitorsToday.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        time: p.time
      }))
    });

  } catch (err: any) {
    console.error("Premium Analytics API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
