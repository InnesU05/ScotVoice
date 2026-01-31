import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone'); // e.g., +447...

    if (!phone) return NextResponse.json({ error: "Missing 'phone' parameter" }, { status: 400 });

    // 1. Find the User & Vapi Details in Database
    const { data: record, error } = await supabaseAdmin
      .from('assistants')
      .select(`
        vapi_phone_number_id,
        profiles:user_id ( business_name )
      `)
      .eq('twilio_phone_number', phone)
      .single();

    if (error || !record) {
      return NextResponse.json({ 
        status: "❌ Number NOT found in DB", 
        details: error 
      });
    }

    const profile = record.profiles as any;
    const businessName = profile?.business_name || "Valued Customer";
    const vapiNumberId = record.vapi_phone_number_id;

    console.log(`🔧 Patching Vapi Number: ${vapiNumberId} with Name: ${businessName}`);

    // 2. CALL VAPI API TO STAMP THE NAME (The Magic Fix)
    const vapiResponse = await fetch(`https://api.vapi.ai/phone-number/${vapiNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // This tells Vapi: "When Rab answers THIS number, use THIS name."
        assistantOverrides: {
          variableValues: {
            business_name: businessName,
          }
        }
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      return NextResponse.json({ status: "❌ Vapi Patch Failed", error: errorText });
    }

    const vapiData = await vapiResponse.json();

    return NextResponse.json({
      status: "✅ SUCCESS! Business Name Stamped.",
      business_name: businessName,
      vapi_update: "Complete",
      instruction: "Call the number now. Rab should say the name."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}