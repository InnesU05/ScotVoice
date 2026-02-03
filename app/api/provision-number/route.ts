import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: Request) {
  try {
    const { userId, areaCode } = await req.json();

    // 1. Buy Number from Twilio
    const incomingPhoneNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: `+44${areaCode || '7700900000'}`, // Example UK logic, adjust as needed
      // CRITICAL: Point Voice URL to our new handler
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio-voice`, 
      voiceMethod: 'POST'
    });

    // 2. Save to DB
    // We don't need to create a Retell Agent here. We just save the number.
    const { error } = await supabaseAdmin
      .from('assistants')
      .upsert({
        user_id: userId,
        twilio_phone_number: incomingPhoneNumber.phoneNumber,
        active_voice_id: 'tradie' // Default
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true, phoneNumber: incomingPhoneNumber.phoneNumber });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}