const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

const OLD_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const OLD_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const NEW_URL = getEnv('NEXT_PUBLIC_SUPABASE_IDKT_URL');
const NEW_KEY = getEnv('SUPABASE_IDKT_SERVICE_ROLE_KEY');

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
    console.error('Missing required environment variables in .env.local');
    process.exit(1);
}

const supabaseOld = createClient(OLD_URL, OLD_KEY);
const supabaseNew = createClient(NEW_URL, NEW_KEY);

const BATCH_SIZE = 1000;

async function migrate() {
    console.log('--- IDKT Migration Started ---');
    console.log(`Source: ${OLD_URL}`);
    console.log(`Destination: ${NEW_URL}`);

    // 1. Get total count
    const { count: total, error: countErr } = await supabaseOld
        .from('idkt_items')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error('Error getting source count:', countErr);
        return;
    }

    console.log(`Total items to migrate: ${total}`);

    let offset = 0;
    let totalMigrated = 0;

    while (offset < total) {
        console.log(`Fetching batch ${offset} to ${offset + BATCH_SIZE}...`);
        
        const { data: items, error: fetchErr } = await supabaseOld
            .from('idkt_items')
            .select('*')
            .order('full_path', { ascending: true })
            .range(offset, offset + BATCH_SIZE - 1);

        if (fetchErr) {
            console.error('Error fetching batch:', fetchErr);
            break;
        }

        if (!items || items.length === 0) break;

        // Clean items (remove potential id conflicts if needed, but upsert on full_path is safer)
        // Actually we keep IDs if they are UUIDs.
        
        const { error: insertErr } = await supabaseNew
            .from('idkt_items')
            .upsert(items, { onConflict: 'full_path' });

        if (insertErr) {
            console.error('Error inserting batch:', insertErr);
            // We could try smaller batches if this fails due to payload size
            break;
        }

        totalMigrated += items.length;
        offset += BATCH_SIZE;
        console.log(`Progress: ${totalMigrated} / ${total} items migrated.`);
    }

    console.log('--- Migration Finished ---');
    console.log(`Successfully migrated ${totalMigrated} items.`);
}

migrate().catch(err => {
    console.error('Fatal Migration Error:', err);
});
