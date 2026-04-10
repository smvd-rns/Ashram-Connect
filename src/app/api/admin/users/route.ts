import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { safeAuth, safeQuery } from "@/lib/resilient-db";

// Helper to check for Super Admin role
async function checkSuperAdmin(token: string) {
  const { data: { user }, error: authError } = await safeAuth(() => supabase.auth.getUser(token), "Check Admin User");
  if (authError || !user) return false;

  const { data: profile } = await safeQuery(() => 
    supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
    "Check Admin Role"
  );

  return profile?.role === 1;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!(await checkSuperAdmin(token))) {
      return NextResponse.json({ error: "Access Denied: Super Admin Only" }, { status: 403 });
    }

    // List all user profiles
    const { data: profiles, error } = await safeQuery(() => 
        supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),
        "List User Profiles"
    );

    if (error) throw error;

    return NextResponse.json({ profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!(await checkSuperAdmin(token))) {
      return NextResponse.json({ error: "Access Denied: Super Admin Only" }, { status: 403 });
    }

    const { targetUserId, newRole } = await request.json();

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!supabaseAdmin) throw new Error("Admin Client not configured");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!(await checkSuperAdmin(token))) {
      return NextResponse.json({ error: "Access Denied: Super Admin Only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing Target User ID" }, { status: 400 });
    }

    if (!supabaseAdmin) throw new Error("Admin Client not configured");

    // Profile delete (cascade is nice but we do it manually to be safe)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (profileError) throw profileError;

    // Auth user delete
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
