import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    // ---------------------------------------------------------
    // 1. INCOMING CALL (Inject Business Name)
    // ---------------------------------------------------------
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      if (!calledNumber) {
        console.error('❌ No phone number ID in request');
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
      }

      console.log(`📞 Call Request for Number ID: ${calledNumber}`);

      // STEP 1: Find which User owns this number
      const { data: assistantRecord, error: assistantError } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (assistantError || !assistantRecord) {
        console.error('❌ Could not find assistant record:', assistantError);
        // Fallback so Rab still speaks
        return NextResponse.json({ 
          assistant: { variableValues: { business_name: "the business" } } 
        });
      }

      // STEP 2: Get that User's Business Name (Separate Query = Safer)
      const { data: profileRecord, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('business_name')
        .eq('id', assistantRecord.user_id)
        .single();

      if (profileError || !profileRecord) {
        console.error('❌ Could not find profile:', profileError);
        return NextResponse.json({ 
          assistant: { variableValues: { business_name: "the business" } } 
        });
      }

      const businessName = profileRecord.business_name || "Our Business";
      console.log(`✅ Found Business Name: ${businessName}`);

      // STEP 3: Send it to Rab
      return NextResponse.json({
        assistant: {
          variableValues: {
            business_name: businessName,
          }
        }
      });
    }

    // ---------------------------------------------------------
    // 2. END OF CALL (Save Log to Database)
    // ---------------------------------------------------------
    if (message.type === 'end-of-call-report') {
      
      const call = message.call;
      const calledNumber = message.phoneNumber.id; 

      // 1. Find the User who owns this number
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_phone_number_id', calledNumber)
        .single();

      if (assistantRecord) {
        // 2. Save the Call Log
        const { error } = await supabaseAdmin
          .from('calls')
          .insert({
            user_id: assistantRecord.user_id,
            call_id: call.id,
            caller_number: call.customer.number,
            transcript: message.transcript,
            summary: message.summary,
            duration_seconds: message.durationSeconds,
            recording_url: message.recordingUrl,
            status: call.status,
          });
          
        if (error) console.error('❌ Failed to save call log:', error);
        else console.log(`✅ Call log saved for User ${assistantRecord.user_id}`);
      }
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Webhook Fatal Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}