import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch submissions (Manager only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Fetch Submissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let dbQuery = supabase.from("travel_submissions").select("*").eq("is_deleted", false);

    // If NOT manager (Role 5) or Super Admin (Role 1), restrict to OWN data
    if (profile?.role !== 1 && profile?.role !== 5) {
      dbQuery = dbQuery.eq("user_id", user.id);
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Travel Desk GET Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a form (BCDB users only)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const { 
      email_id, 
      devotee_name, 
      departure_date, 
      return_date, 
      places_of_travel, 
      purpose_of_travel, 
      accompanying_bcari, 
      counselor_email 
    } = body;

    // Validation
    if (!email_id || !devotee_name || !departure_date || !return_date || !places_of_travel || !purpose_of_travel) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("travel_submissions")
      .insert([{
        user_id: user.id,
        email_id,
        devotee_name,
        departure_date,
        return_date,
        places_of_travel,
        purpose_of_travel,
        accompanying_bcari,
        counselor_email,
        status: 'Pending'
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Travel Desk POST Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update status (Manager only)
export async function PATCH(req: NextRequest) {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  
      const token = authHeader.split(" ")[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  
      // Check if user is Manager (Role 5) or Super Admin (Role 1)
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== 1 && profile?.role !== 5) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  
      const body = await req.json();
      const { id, status } = body;
  
      const { data, error } = await supabase
        .from("travel_submissions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;
      return NextResponse.json({ data });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
