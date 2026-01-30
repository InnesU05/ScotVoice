import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Vapi sends a 'message' object. We care about 'assistant-request'.
    if (body.message.type === 'assistant-request') {
      
      const call = body.message.call;
      const calledNumber = call.phoneNumberId; 

      if (!calledNumber) {
        console.error('No phone number ID in request');
        return NextResponse.json({ error: 'Missing phone number ID' }, { status: 400 });
      }

      // 1. Look up who owns this number in Supabase
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          user_id,
          profiles:user_id (
            business_name,
            industry
          )
        `)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (error || !assistantRecord) {
        console.error('Could not find owner for number:', calledNumber);
        // Fallback: Let the call proceed with default generic variables
        return NextResponse.json({ 
          assistant: {
            variableValues: {
              business_name: "the business",
            }
          }
        });
      }

      const profile = assistantRecord.profiles as any;

      console.log(`📞 Call for ${profile.business_name} (Owner: ${assistantRecord.user_id})`);

      // 2. Return the Dynamic Variables to Vapi
      return NextResponse.json({
        assistant: {
          // --- CHANGED HERE: Removed 'model' block to preserve Rab's personality ---
          variableValues: {
            business_name: profile.business_name || "Our Business",
          }
        }
      });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}