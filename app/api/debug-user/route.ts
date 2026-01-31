import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Please add ?phone=+447... to the URL' });
    }

    // 1. Check if the number exists in 'assistants'
    const { data: assistant, error: assistError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('twilio_phone_number', phoneNumber)
      .single();

    if (assistError || !assistant) {
      return NextResponse.json({ 
        status: '❌ Number NOT found in DB', 
        details: assistError 
      });
    }

    // 2. Check the Profile (Business Name)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', assistant.user_id)
      .single();

    return NextResponse.json({
      status: '✅ Diagnosis Complete',
      phone_number: phoneNumber,
      linked_user_id: assistant.user_id,
      business_name_in_db: profile?.business_name || '⚠️ NULL/EMPTY',
      profile_data: profile,
      profile_error: profileError
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}