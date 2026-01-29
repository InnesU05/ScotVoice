import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Twilio from 'twilio';

// Initialize Twilio
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: Request) {
  try {
    const { userId, businessName } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // 1. Search for a UK Mobile Number (+44 7...)
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });

    if (availableNumbers.length === 0) {
      throw new Error('No UK numbers available right now.');
    }

    const chosenNumber = availableNumbers[0];

    // 2. Buy the Number (Uses Student Credits)
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber.phoneNumber,
      friendlyName: `ScotVoice: ${businessName || userId}`,
    });

    console.log(`✅ Purchased: ${purchasedNumber.phoneNumber}`);

    // 3. Import to Vapi (The "Brain" Connection)
    const vapiResponse = await fetch('https://api.vapi.ai/phone-number/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'twilio',
        number: purchasedNumber.phoneNumber,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        assistantId: process.env.NEXT_PUBLIC_VAPI_MASTER_ASSISTANT_ID,
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi Import Error:', errorText);
      throw new Error('Failed to link number to Vapi');
    }

    const vapiData = await vapiResponse.json();

    // 4. Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('assistants')
      .insert({
        user_id: userId,
        twilio_phone_number: purchasedNumber.phoneNumber,
        twilio_phone_sid: purchasedNumber.sid,
        vapi_phone_number_id: vapiData.id,
        vapi_assistant_id: process.env.NEXT_PUBLIC_VAPI_MASTER_ASSISTANT_ID,
      });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      phoneNumber: purchasedNumber.phoneNumber 
    });

  } catch (error: any) {
    console.error('Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
