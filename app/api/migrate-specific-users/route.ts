import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// 🎯 CONFIGURATION
const RAB_BLUEPRINT_ID = '6af03c9c-2797-4818-8dfc-eb604c247f3d'; // The "Tradie" Blueprint

// 🎯 TARGET EMAILS (Only these will be updated)
const TARGET_EMAILS = [
  'innes.urquhart5@gmail.com',
  'innes.urquhart4@gmail.com'
];

export async function GET(req: Request) {
  try {
    const results = [];

    // 1. Fetch ALL assistants from the DB
    const { data: allAssistants, error } = await supabaseAdmin
      .from('assistants')
      .select(`
        id,
        user_id,
        vapi_phone_number_id,
        twilio_phone_number,
        profiles:user_id ( business_name )
      `);

    if (error || !allAssistants) {
      return NextResponse.json({ error: error?.message || 'No data found' }, { status: 500 });
    }

    console.log(`🚀 Checking ${allAssistants.length} users for targets...`);

    // 2. Fetch the Rab Blueprint ONCE
    const blueprintResponse = await fetch(`https://api.vapi.ai/assistant/${RAB_BLUEPRINT_ID}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
    });

    if (!blueprintResponse.ok) throw new Error('Failed to fetch Rab Blueprint');
    const blueprint = await blueprintResponse.json();

    // 3. Loop and Filter by Email
    for (const record of allAssistants) {
      
      // A. Get the User's Email from Supabase Auth
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(record.user_id);
      
      if (userError || !user || !user.email) {
        console.log(`⚠️ Could not find user for ID: ${record.user_id}`);
        continue;
      }

      const userEmail = user.email.trim();

      // B. CHECK: Is this user in our Target List?
      if (!TARGET_EMAILS.includes(userEmail)) {
        console.log(`⏭️ Skipping: ${userEmail} (Not in target list)`);
        continue; // Skip this loop iteration
      }

      // C. FOUND ONE! START MIGRATION
      const profile = record.profiles as any;
      const businessName = profile?.business_name || "Valued Customer";
      const phoneId = record.vapi_phone_number_id;

      try {
        console.log(`🔧 MIGRATING TARGET: ${userEmail} (${businessName})...`);

        // D. Prepare the Prompt (Clone & Stamp)
        let systemMessage = blueprint.model.messages.find((m: any) => m.role === 'system')?.content || "";
        systemMessage = systemMessage.replace(/{{business_name}}/g, businessName);

        let firstMessage = blueprint.firstMessage || "";
        firstMessage = firstMessage.replace(/{{business_name}}/g, businessName);

        // E. Create Dedicated "Rab"
        const newAssistantPayload = {
          ...blueprint,
          name: `Rab (${businessName})`, 
          firstMessage: firstMessage,
          model: {
            ...blueprint.model,
            messages: [
              { role: 'system', content: systemMessage },
              ...blueprint.model.messages.filter((m: any) => m.role !== 'system')
            ]
          },
          // Strip illegal fields
          id: undefined,
          orgId: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          isServerUrlSecretSet: undefined,
        };

        const createRes = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAssistantPayload),
        });

        if (!createRes.ok) throw new Error(await createRes.text());
        const newAssistant = await createRes.json();

        // F. Link to EXISTING Phone Number
        await fetch(`https://api.vapi.ai/phone-number/${phoneId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assistantId: newAssistant.id }),
        });

        // G. Update Database
        await supabaseAdmin
          .from('assistants')
          .update({ vapi_assistant_id: newAssistant.id })
          .eq('id', record.id);

        results.push({ 
          status: "✅ UPDATED", 
          email: userEmail,
          business: businessName 
        });

      } catch (err: any) {
        console.error(`❌ Failed to migrate ${businessName}:`, err);
        results.push({ status: "❌ Failed", email: userEmail, error: err.message });
      }
    }

    return NextResponse.json({ 
      summary: "Targeted Migration Complete", 
      targets_processed: results 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}