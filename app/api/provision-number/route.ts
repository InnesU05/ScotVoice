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
    const YOUR_BUNDLE_SID = 'BUf1c5944923fe75b2b3b98629eab0d474'; 
    // ---------------------

    const { userId, businessName, voiceId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    
    const selectedAssistantId = VOICE_MAP[voiceId];
    
    if (!selectedAssistantId) {
      console.error('Missing Assistant ID for:', voiceId);
      return NextResponse.json({ error: 'Invalid Voice Selection (Assistant ID missing)' }, { status: 400 });
    }

    // 3. Search & Buy Twilio Number
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });

    if (availableNumbers.length === 0) throw new Error('No UK numbers available');
    const chosenNumber = availableNumbers[0];

    // BUY NUMBER
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber.phoneNumber,
      friendlyName: `NessDial: ${businessName} (${voiceId})`,
      bundleSid: YOUR_BUNDLE_SID,
    });

    console.log(`✅ Number Purchased: ${purchasedNumber.phoneNumber}`);

    // 4. Import to Vapi (FIXED PAYLOAD STRUCTURE)
    const vapiResponse = await fetch('https://api.vapi.ai/phone-number/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // REMOVED: provider: 'twilio' (Vapi doesn't want this)
        // REMOVED: number: ... (Wrong key name)
        
        // ADDED: The specific key Vapi requires
        twilioPhoneNumber: purchasedNumber.phoneNumber, 
        
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        assistantId: selectedAssistantId,
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi Import Failed:', errorText);
      throw new Error(`Vapi Error: ${errorText}`);
    }

    const vapiData = await vapiResponse.json();

    // 5. Save to Supabase
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