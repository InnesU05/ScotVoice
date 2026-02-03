import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    // 1. SEARCH for a UK Mobile Number (+44 7...)
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });

    if (!availableNumbers || availableNumbers.length === 0) {
      throw new Error("No numbers available at the moment.");
    }

    const selectedNumber = availableNumbers[0].phoneNumber;

    // 2. BUY the number
    const incomingPhoneNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber,
      // CRITICAL: Point Voice URL to our new handler
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio-voice`, 
      voiceMethod: 'POST'
    });

    // 3. SAVE to DB
    const { error } = await supabaseAdmin
      .from('assistants')
      .upsert({
        user_id: userId,
        twilio_phone_number: incomingPhoneNumber.phoneNumber,
        active_voice_id: 'tradie' 
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true, phoneNumber: incomingPhoneNumber.phoneNumber });

  } catch (error: any) {
    console.error("Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}