import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    
    let dbQuery = supabase.from("bcdb").select("*").order("created_at", { ascending: false });
    
    if (query) {
      dbQuery = dbQuery.or(`legal_name.ilike.%${query}%,initiated_name.ilike.%${query}%,email_id.ilike.%${query}%,contact_no.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;
    if (error) {
      console.error("BCDB GET Error:", error);
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      details: error,
      hint: "Check if the 'bcdb' table exists and the 'uuid-ossp' extension is enabled in Supabase."
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === "upsert") {
      const { id, ...record } = data;
      
      const { data: upserted, error } = await supabase
        .from("bcdb")
        .upsert([{ id: id || undefined, ...record }])
        .select()
        .single();
      
      if (error) {
        console.error("BCDB UPSERT Error:", error);
        throw error;
      }
      return NextResponse.json({ data: upserted });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      details: error,
      hint: "Ensure 'email_id' has a UNIQUE constraint and you are sending valid data."
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("bcdb").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
