import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Twilio from 'twilio';

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Map the user's choice to your Env Variables
const VOICE_MAP: Record<string, string | undefined> = {
  'tradie': process.env.VAPI_ASSISTANT_ID_TRADIE,
  'pro': process.env.VAPI_ASSISTANT_ID_PRO,
  'coach': process.env.VAPI_ASSISTANT_ID_COACH,
};

export async function POST(req: Request) {
  try {
    // --- CONFIGURATION ---
    // PASTE YOUR TWILIO BUNDLE SID HERE
    const YOUR_BUNDLE_SID = 'BUf1c5944923fe75b2b3b98629eab0d474'; 
    // ---------------------

    // 1. We now expect a 'voiceId' (tradie/pro/coach) from the frontend
    const { userId, businessName, voiceId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    
    // 2. Select the correct Vapi Assistant ID
    const selectedAssistantId = VOICE_MAP[voiceId];
    
    if (!selectedAssistantId) {
      return NextResponse.json({ error: 'Invalid Voice Selection' }, { status: 400 });
    }

    // 3. Search & Buy Twilio Number (UK Mobile)
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });

    if (availableNumbers.length === 0) throw new Error('No UK numbers available');
    const chosenNumber = availableNumbers[0];

    // BUY NUMBER WITH BUNDLE SID
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber.phoneNumber,
      friendlyName: `NessDial: ${businessName} (${voiceId})`,
      bundleSid: YOUR_BUNDLE_SID, // <--- This authorizes the purchase
    });

    // 4. Import to Vapi using the SPECIFIC Assistant ID
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
        assistantId: selectedAssistantId, // <--- Dynamic ID here
      }),
    });

    if (!vapiResponse.ok) throw new Error('Failed to link number to Vapi');
    const vapiData = await vapiResponse.json();

    // 5. Save to Supabase (Now including the voice_type)
    const { error: dbError } = await supabaseAdmin
      .from('assistants')
      .insert({
        user_id: userId,
        twilio_phone_number: purchasedNumber.phoneNumber,
        twilio_phone_sid: purchasedNumber.sid,
        vapi_phone_number_id: vapiData.id,
        vapi_assistant_id: selectedAssistantId,
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, phoneNumber: purchasedNumber.phoneNumber });

  } catch (error: any) {
    console.error('Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}