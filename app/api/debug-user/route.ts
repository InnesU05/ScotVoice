import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    console.log(`🔍 Looking for phone: ${phone}`);

    // ---------------------------------------------------------
    // 1. IF NO PHONE PROVIDED (or lookup fails), LIST ALL NUMBERS
    // ---------------------------------------------------------
    if (!phone) {
      const { data: allRows, error } = await supabaseAdmin
        .from('assistants')
        .select('twilio_phone_number, vapi_phone_number_id, user_id, profiles(business_name)');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({
        message: "⚠️ No phone parameter provided. Here are ALL numbers in your DB:",
        instructions: "Find your number below. Copy the 'twilio_phone_number' exactly and add ?phone=YOUR_NUMBER to the URL.",
        database_contents: allRows
      });
    }

    // ---------------------------------------------------------
    // 2. SEARCH FOR SPECIFIC PHONE
    // ---------------------------------------------------------
    // We try to find the number, normalizing spaces/plus signs
    const { data: record, error } = await supabaseAdmin
      .from('assistants')
      .select(`
        vapi_phone_number_id,
        twilio_phone_number,
        profiles:user_id ( business_name )
      `)
      .eq('twilio_phone_number', phone)
      .maybeSingle(); // <--- Use maybeSingle() instead of single() to prevent crash

    // IF NOT FOUND -> RETURN THE LIST TO HELP USER
    if (!record) {
       const { data: allRows } = await supabaseAdmin
        .from('assistants')
        .select('twilio_phone_number, vapi_phone_number_id, profiles(business_name)');
        
       return NextResponse.json({ 
        status: "❌ Number NOT found in DB", 
        searched_for: phone,
        hint: "Your database contains these numbers instead. Please use one of these exact formats:",
        available_numbers: allRows
      });
    }

    // ---------------------------------------------------------
    // 3. FOUND IT! STAMP THE NAME
    // ---------------------------------------------------------
    const profile = record.profiles as any;
    const businessName = profile?.business_name || "Valued Customer";
    const vapiNumberId = record.vapi_phone_number_id;

    console.log(`🔧 Patching Vapi Number: ${vapiNumberId} with Name: ${businessName}`);

    const vapiResponse = await fetch(`https://api.vapi.ai/phone-number/${vapiNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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

    return NextResponse.json({
      status: "✅ SUCCESS! Business Name Stamped.",
      business_name: businessName,
      number: record.twilio_phone_number,
      vapi_update: "Complete"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}