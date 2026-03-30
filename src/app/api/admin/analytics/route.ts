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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== 1) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Fetch All Profile Timestamps (Simplified Approach)
    const { data: allProfiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, last_visit_at, temple, role")
      .not("last_visit_at", "is", null);

    if (error) throw error;

    // 3. Process Aggregate Data
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Grouping by Date
    const dailyCounts: Record<string, number> = {};
    const visitorsToday: any[] = [];
    
    allProfiles.forEach(p => {
      const date = new Date(p.last_visit_at!).toISOString().split("T")[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      if (date === todayStr) visitorsToday.push(p);
    });

    // 4. Case: Fetch specific user list for a date (Deep-dive)
    if (targetDate) {
      const usersForDate = allProfiles.filter(p => {
        const date = new Date(p.last_visit_at!).toISOString().split("T")[0];
        return date === targetDate;
      }).map(p => ({
        id: p.id,
        name: p.full_name || "Unknown",
        email: p.email || "Unknown",
        temple: p.temple || "Unknown",
        role: p.role || 6,
        time: p.last_visit_at
      }));

      return NextResponse.json({ users: usersForDate });
    }

    // 5. Generate Summary Results
    const history = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // Last 30 active days

    const totalActiveDays = Object.keys(dailyCounts).length;
    const totalUsersEverVisit = allProfiles.length;
    const visitorsCountToday = dailyCounts[todayStr] || 0;
    
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
        visitorsInView: totalUsersEverVisit,
        avgVisitorsPerDay: totalActiveDays > 0 ? (totalUsersEverVisit / totalActiveDays).toFixed(1) : "0",
        busiestDay,
        busiestCount
      },
      history,
      todayList: visitorsToday.map(p => ({
        id: p.id,
        name: p.full_name || "Unknown",
        email: p.email || "Unknown",
        time: p.last_visit_at
      }))
    });

  } catch (err: any) {
    console.error("Premium Analytics API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
