import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    if (message.type === 'assistant-request') {
      
      // 1. Still do the lookup to get the Business Name
      const calledNumber = message.call.phoneNumberId; 
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select(`profiles:user_id ( business_name )`)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      const profile = assistantRecord?.profiles as any;
      const businessName = profile?.business_name || "Valued Customer";

      console.log(`✅ FORCE MODE: Sending Rab + ${businessName}`);

      // 2. 🚨 FORCE THE ID (Ignore Database ID for now) 🚨
      return NextResponse.json({
        assistantId: "6af03c9c-2797-4818-8dfc-eb604c247f3d", // <--- Rab's Real ID
        assistant: {
          variableValues: {
            business_name: businessName,
          }
        }
      });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}