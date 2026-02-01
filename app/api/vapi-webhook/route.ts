import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // ==========================================
    // 1. INCOMING CALL (Your Existing Logic)
    // ==========================================
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      // Look up the business name in Supabase
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          profiles:user_id ( business_name )
        `)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      // Default Name if database fails
      let businessName = "Valued Customer";
      let assistantIdToUse = "6af03c9c-2797-4818-8dfc-eb604c247f3d"; // Default Rab ID

      if (!error && assistantRecord) {
        const profile = assistantRecord.profiles as any;
        businessName = profile?.business_name || "Our Business";
        // Use the ID from the DB if it exists, otherwise fall back to default
        if (assistantRecord.vapi_assistant_id) {
            assistantIdToUse = assistantRecord.vapi_assistant_id;
        }
      } else {
        console.error('⚠️ DB Lookup Failed (Using Defaults):', error);
      }
      
      console.log(`✅ Injecting Name: ${businessName}`);

      return NextResponse.json({
        assistantId: assistantIdToUse,
        assistant: {
          variableValues: {
            business_name: businessName,
          },
          // 🛡️ SAFETY OVERRIDE (Preserved as requested)
          voice: {
            provider: "playht",
            voiceId: "jennifer" 
          }
        }
      });
    }

    // ==========================================
    // 2. END OF CALL REPORT (New Logging Logic)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      
      console.log(`📞 Call Ended. ID: ${call.id}`);

      // A. Find the User
      const { data: assistantRecord, error: lookupError } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (lookupError || !assistantRecord) {
        console.error('❌ Could not find user for this call:', call.assistantId);
      } else {
        // B. Save to 'calls' table
        const { error: insertError } = await supabaseAdmin
          .from('calls')
          .insert({
            user_id: assistantRecord.user_id,
            assistant_id: call.assistantId,
            customer_number: call.customer?.number || 'Unknown',
            status: message.endedReason || 'completed',
            duration_seconds: Math.round(message.durationSeconds || 0),
            summary: analysis.summary || "No summary provided.",
            recording_url: message.recordingUrl || null,
            started_at: call.startedAt || new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Failed to save call log:', insertError);
        } else {
          console.log('✅ Call Log Saved Successfully');
        }
      }
      
      return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}