import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database service client unavailable." }, { status: 503 });
    }

    const body = await req.json();

    // Data normalization & Basic validation
    const requiredFields = ["legal_name", "contact_no", "email_id"];
    for (const field of requiredFields) {
      if (!body[field]?.toString().trim()) {
        return NextResponse.json({ error: `${field.replace("_", " ")} is a required field.` }, { status: 400 });
      }
    }

    // Map fields cleanly to prevent injection of unexpected keys
    const record = {
      initiated_name: body.initiated_name || null,
      legal_name: body.legal_name?.trim(),
      initiation: body.initiation || "Not Initiated",
      colour: body.colour || "White",
      spiritual_master: body.spiritual_master || null,
      dob_adhar: body.dob_adhar || null,
      dob_actual: body.dob_actual || null,
      contact_no: body.contact_no?.trim(),
      email_id: body.email_id?.trim().toLowerCase(),
      counsellor: body.counsellor || null,
      center: body.center || null,
      year_joining: body.year_joining ? parseInt(body.year_joining) : null,
      prasadam: body.prasadam || null,
      primary_services: body.primary_services || null,
      secondary_services: body.secondary_services || null,
      blood_group: body.blood_group || null,
      aadhar_number: body.aadhar_number || null,
      address_adhar: body.address_adhar || null,
      pan_card: body.pan_card || null,
      photo_url: body.photo_url || null, // IDKT Link
      relative_contact_1: body.relative_contact_1 || null,
      relative_contact_2: body.relative_contact_2 || null,
      relative_contact_3: body.relative_contact_3 || null,
      email_address: body.email_address || body.email_id || null,
      adhar_card_copy_url: body.adhar_card_copy_url || null, // IDKT Link
      pan_card_copy_url: body.pan_card_copy_url || null, // IDKT Link
      parents_address: body.parents_address || null,
      whatsapp_no: body.whatsapp_no || null,
      custom_counsellor: body.custom_counsellor || null,
      status: "pending" // Explicitly force pending
    };

    const userEmail = record.email_id;

    // A. Verify if the user is already present in the Master BCDB directory
    const { data: existingMaster } = await supabaseAdmin
      .from("bcdb")
      .select("id")
      .eq("email_id", userEmail)
      .maybeSingle();

    if (existingMaster) {
      return NextResponse.json({ 
        error: "A registration with this Email ID already exists in the Master Directory." 
      }, { status: 409 });
    }

    // B. Verify if there is an unresolved pending registration request currently under review
    const { data: existingPending } = await supabaseAdmin
      .from("bcdb_submissions")
      .select("id")
      .eq("email_id", userEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ 
        error: "A registration submission for this Email ID is already pending review. Please wait for approval." 
      }, { status: 409 });
    }

    console.log("[BCDB SUBMISSION] Attempting submission insert for:", record.legal_name);

    const { data, error } = await supabaseAdmin
      .from("bcdb_submissions")
      .insert(record)
      .select("id")
      .single();

    if (error) {
      console.error("[BCDB SUBMISSION] DB Error during submission:", error);
      return NextResponse.json({ error: `Submission recording failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Your registration request has been successfully recorded and queued for admin approval.",
      submissionId: data.id
    });

  } catch (error: any) {
    console.error("[BCDB SUBMISSION EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || "Submission pipeline encountered an unexpected failure." }, { status: 500 });
  }
}
