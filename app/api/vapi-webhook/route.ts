import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event Received: ${message.type}`);

    // 1. INCOMING CALL (The "Who should answer?" Request)
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      // Look up the phone number in Supabase
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          profiles:user_id ( business_name )
        `)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      // --- FAILSAFE: If DB lookup fails, use the Hardcoded ID ---
      if (error || !assistantRecord) {
        console.error('❌ DB Lookup Failed:', error);
        return NextResponse.json({ 
          // THIS IS THE ID YOU PROVIDED
          assistantId: "6af03c9c-2797-4818-8dfc-eb604c247f3d", 
          assistant: { variableValues: { business_name: "Valued Customer" } } 
        });
      }

      const profile = assistantRecord.profiles as any;
      const businessName = profile?.business_name || "Our Business";
      
      console.log(`✅ Injecting Name: ${businessName}`);

      // Return the ID found in the database (which you fixed in Step 1)
      return NextResponse.json({
        assistantId: assistantRecord.vapi_assistant_id, 
        assistant: {
          variableValues: {
            business_name: businessName,
          }
        }
      });
    }

    // 2. END OF CALL (Logging)
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const calledNumber = message.phoneNumber?.id; 

      if (calledNumber) {
        const { data: assistantRecord } = await supabaseAdmin
          .from('assistants')
          .select('user_id')
          .eq('vapi_phone_number_id', calledNumber)
          .single();

        if (assistantRecord) {
          await supabaseAdmin.from('calls').insert({
            user_id: assistantRecord.user_id,
            call_id: call.id,
            caller_number: call.customer.number,
            transcript: message.transcript || "No transcript",
            summary: message.summary || "No summary",
            duration_seconds: message.durationSeconds || 0,
            recording_url: message.recordingUrl || "",
            status: call.status,
          });
          console.log('📝 Call logged.');
        }
      }
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}