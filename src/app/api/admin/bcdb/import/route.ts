import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * BCDB BULK IMPORT API
 * Handles massive ingestion of devotee data records.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!Array.isArray(data)) {
        return NextResponse.json({ error: "Data must be an array of records" }, { status: 400 });
    }

    // Sanitize data: Ensure dates are either valid YYYY-MM-DD strings or NULL
    // Also ensure numeric fields are numbers.
    const sanitizedData = data.map((row: any) => {
        const clean: any = { ...row };
        
        // Postgres DATE fields must be YYYY-MM-DD or null
        const dateFields = ['dob_adhar', 'dob_actual'];
        dateFields.forEach(field => {
            if (!clean[field] || clean[field] === 'null' || clean[field] === 'undefined' || String(clean[field]).trim() === '') {
                clean[field] = null;
            } else if (typeof clean[field] === 'number') {
                // Excel date serial number handling (simplistic)
                const date = new Date(Math.round((clean[field] - 25569) * 86400 * 1000));
                clean[field] = date.toISOString().split('T')[0];
            } else {
                // Attempt to parse string
                try {
                   const d = new Date(clean[field]);
                   if (!isNaN(d.getTime())) {
                       clean[field] = d.toISOString().split('T')[0];
                   } else {
                       clean[field] = null;
                   }
                } catch {
                    clean[field] = null;
                }
            }
        });

        // Numeric fields
        if (clean.year_joining) {
            const y = parseInt(clean.year_joining);
            clean.year_joining = isNaN(y) ? null : y;
        }

        return clean;
    });

    const { data: inserted, error } = await supabase
      .from("bcdb")
      .upsert(sanitizedData, { onConflict: 'email_id' })
      .select();
    
    if (error) {
        console.error("BCDB IMPORT ERROR Details:", error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: inserted?.length || 0 });
  } catch (error: any) {
    console.error("BCDB IMPORT CRASH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
