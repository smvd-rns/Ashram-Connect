import { NextRequest, NextResponse } from "next/server";
import { supabaseIdktAdmin } from "@/lib/supabaseIdkt";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = "bcdb-registrations";

/**
 * Ensuring the IDKT Storage bucket is active and configured
 */
async function ensureBucketExists() {
  if (!supabaseIdktAdmin) {
    throw new Error("IDKT Supabase Admin client not initialized. Check environment keys.");
  }

  const { data: buckets, error: listError } = await supabaseIdktAdmin.storage.listBuckets();
  if (listError) {
    console.error("Failed to list IDKT buckets:", listError);
    return; // Proceed anyway and attempt, in case listing is restricted but access is fine
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`[IDKT Storage] Creating public bucket: ${BUCKET_NAME}`);
    const { error: createError } = await supabaseIdktAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      fileSizeLimit: 5 * 1024 * 1024 // 5MB Limit
    });
    
    if (createError) {
      console.error(`Failed to create IDKT bucket '${BUCKET_NAME}':`, createError);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseIdktAdmin) {
      return NextResponse.json({ error: "IDKT Storage is not configured." }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "misc"; // "personal", "pan", "adhar"

    if (!file) {
      return NextResponse.json({ error: "File must be provided" }, { status: 400 });
    }

    // Check Size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 5MB limit." }, { status: 400 });
    }

    // 1. Setup bucket
    await ensureBucketExists();

    // 2. Prepare metadata/file path
    const originalName = file.name;
    const extension = originalName.split(".").pop() || "jpg";
    const safeName = `${type}_${uuidv4()}.${extension}`;
    
    // 3. Convert File object to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[IDKT Upload] Storing file '${originalName}' under key '${safeName}'...`);

    const { data, error: uploadError } = await supabaseIdktAdmin.storage
      .from(BUCKET_NAME)
      .upload(safeName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.error("[IDKT Upload] Storage failure:", uploadError);
      throw uploadError;
    }

    // 4. Derive the Public URL
    const { data: urlData } = supabaseIdktAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(safeName);

    return NextResponse.json({ 
      success: true,
      publicUrl: urlData.publicUrl,
      filePath: data.path
    });

  } catch (error: any) {
    console.error("[IDKT Upload API Error]:", error);
    return NextResponse.json({ error: error.message || "Upload execution failed." }, { status: 500 });
  }
}
