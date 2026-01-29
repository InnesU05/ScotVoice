import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Vapi sends a 'message' object. We care about 'assistant-request'.
    // This happens the moment a call comes in, BEFORE the AI speaks.
    if (body.message.type === 'assistant-request') {
      
      const call = body.message.call;
      // The phone number the customer called (Your Twilio Number)
      const calledNumber = call.phoneNumberId; 

      if (!calledNumber) {
        console.error('No phone number ID in request');
        return NextResponse.json({ error: 'Missing phone number ID' }, { status: 400 });
      }

      // 1. Look up who owns this number in Supabase
      // We join the 'assistants' table with 'profiles' to get business details
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
      // This tells Rab/Claire exactly who they are pretending to be.
      return NextResponse.json({
        assistant: {
          // We override the ID just in case, but mainly we inject variables
          model: {
            // This injects values into the System Prompt {{business_name}}
            messages: [
              {
                role: "system",
                content: `You are the receptionist for ${profile.business_name}. Keep it brief.`
                // Note: Vapi merges this with your dashboard prompt if you use variable substitution
              }
            ],
            // If you used {{business_name}} in your Vapi Dashboard Prompt, use this instead:
            // toolIds: [], 
            // ...
          },
          variableValues: {
            business_name: profile.business_name || "Our Business",
            // Add other dynamic fields here if you added them to the prompt
            // industry: profile.industry, 
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