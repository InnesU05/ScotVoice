import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    // Log the event type to Vercel logs for debugging
    console.log(`📣 Vapi Event Received: ${message.type}`);

    // ---------------------------------------------------------
    // 1. INCOMING CALL (The "Who should answer?" Request)
    // ---------------------------------------------------------
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      // 1. Find the User & Assistant Config
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          profiles:user_id ( business_name )
        `)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (error || !assistantRecord) {
        console.error('❌ DB Lookup Failed:', error);
        // Fallback: Return Rab's ID (You must replace this with your actual Assistant ID)
        // You can find this ID in Vapi Dashboard -> Assistants -> ID
        return NextResponse.json({ 
          assistantId: "6af03c9c-2797-4818-8dfc-eb604c247f3d", 
          assistant: { variableValues: { business_name: "Valued Customer" } } 
        });
      }

      const profile = assistantRecord.profiles as any;
      const businessName = profile.business_name || "Our Business";
      
      console.log(`✅ Injecting Name: ${businessName}`);

      // 2. TELL VAPI WHICH ASSISTANT TO USE + THE NAME
      return NextResponse.json({
        assistantId: assistantRecord.vapi_assistant_id, // <--- CRITICAL: Tells Vapi which brain to load
        assistant: {
          variableValues: {
            business_name: businessName,
          }
        }
      });
    }

    // ---------------------------------------------------------
    // 2. END OF CALL (Save Log)
    // ---------------------------------------------------------
    if (message.type === 'end-of-call-report') {
      // ... (Keep your existing save log code here) ...
      console.log('📝 Call Ended. Logging...');
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}