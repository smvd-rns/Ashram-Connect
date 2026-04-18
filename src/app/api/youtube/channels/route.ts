import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Try to get user from Authorization header
    const authHeader = request.headers.get("Authorization");
    let userId: string | null = null;
    let isSuperAdmin = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        // Check if super admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, roles")
          .eq("id", userId)
          .single();
        
        const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role].filter(r => r !== null && r !== undefined);
        isSuperAdmin = roles.includes(1);
      }
    }

    let query = supabase
      .from("youtube_channels")
      .select("*")
      .eq("is_active", true);

    if (isSuperAdmin) {
      // Super Admin sees everything
    } else if (userId) {
      // Logged in user: Public OR assigned to them
      const { data: assignedIds } = await supabase
        .from("youtube_channel_assignments")
        .select("channel_id")
        .eq("user_id", userId);
      
      const ids = (assignedIds || []).map(a => a.channel_id);
      
      if (ids.length > 0) {
        query = query.or(`visibility.eq.public,id.in.(${ids.map(id => `"${id}"`).join(",")})`);
      } else {
        query = query.eq("visibility", "public");
      }
    } else {
      // Anonymous user: Only Public
      query = query.eq("visibility", "public");
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { channels: data || [] },
      { headers: { "Cache-Control": "private, s-maxage=0, no-cache" } } // Disable cache for personalized results
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}
