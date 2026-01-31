import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // 1. INCOMING CALL
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
          // 🛡️ SAFETY OVERRIDE: 
          // If the Assistant ID has a broken voice, this overrides it to a safe one.
          // You can remove this 'voice' block later once you fix your ElevenLabs key.
          voice: {
            provider: "playht",
            voiceId: "jennifer" 
          }
        }
      });
    }

    // 2. END OF CALL REPORT
    if (message.type === 'end-of-call-report') {
        // (Keep your logging logic here if you want it)
        console.log('📝 Call Ended.');
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}