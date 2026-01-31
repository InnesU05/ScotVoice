import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    // ---------------------------------------------------------
    // 1. SEARCH FOR PHONE IN DB
    // ---------------------------------------------------------
    if (!phone) {
       // (Keep the list logic for safety)
       const { data: allRows } = await supabaseAdmin
        .from('assistants')
        .select('twilio_phone_number');
       return NextResponse.json({ 
        message: "⚠️ Missing 'phone' parameter.", 
        available_numbers: allRows 
      });
    }

    const { data: record, error } = await supabaseAdmin
      .from('assistants')
      .select(`
        id,
        vapi_phone_number_id,
        twilio_phone_number,
        profiles:user_id ( business_name )
      `)
      .eq('twilio_phone_number', phone)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ status: "❌ Number NOT found in DB", searched_for: phone });
    }

    const profile = record.profiles as any;
    const businessName = profile?.business_name || "Valued Customer";
    const vapiNumberId = record.vapi_phone_number_id;

    console.log(`🔧 Creating Dedicated Assistant for: ${businessName}`);

    // ---------------------------------------------------------
    // 2. CREATE A DEDICATED ASSISTANT (The Robust Fix)
    // ---------------------------------------------------------
    // We create a specific assistant for this user so the name is hardcoded.
    const createAssistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Rab (${businessName})`, // Easy to find in Dashboard
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are the helpful receptionist for ${businessName}. Keep your answers short and polite.`
            }
          ]
        },
        voice: {
          provider: "openai", // Safe voice (prevents 11Labs errors)
          voiceId: "alloy"
        },
        firstMessage: `Hello, thanks for calling ${businessName}. How can I help?`
      }),
    });

    if (!createAssistantResponse.ok) {
      const err = await createAssistantResponse.text();
      return NextResponse.json({ status: "❌ Failed to Create Assistant", error: err });
    }

    const newAssistant = await createAssistantResponse.json();
    const newAssistantId = newAssistant.id;

    console.log(`✅ Assistant Created: ${newAssistantId}. Linking to Number...`);

    // ---------------------------------------------------------
    // 3. LINK NEW ASSISTANT TO PHONE NUMBER
    // ---------------------------------------------------------
    const patchResponse = await fetch(`https://api.vapi.ai/phone-number/${vapiNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: newAssistantId, // <--- Link the new ID
      }),
    });

    if (!patchResponse.ok) {
      const err = await patchResponse.text();
      return NextResponse.json({ status: "❌ Failed to Link Assistant", error: err });
    }

    // ---------------------------------------------------------
    // 4. UPDATE DATABASE WITH NEW ID
    // ---------------------------------------------------------
    await supabaseAdmin
      .from('assistants')
      .update({ vapi_assistant_id: newAssistantId })
      .eq('id', record.id);

    return NextResponse.json({
      status: "✅ SUCCESS! Setup Complete.",
      business_name: businessName,
      new_assistant_id: newAssistantId,
      instruction: "Call the number now. It will use this new specific assistant."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}