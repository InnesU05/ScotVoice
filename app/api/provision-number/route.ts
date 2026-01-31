import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Twilio from 'twilio';

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = 'force-dynamic';

// --- 🗣️ YOUR SCOTTISH VOICES MAP ---
const VOICE_CONFIG: Record<string, any> = {
  // 1. TRADIE (Rab) - Already Working
  'tradie': {
    name: 'Rab',
    voiceId: 'cjVigVc5kqAkXjuOp3xK', // ✅ Rab's Real Voice ID
    provider: '11labs',
    firstMessage: (business: string) => `Alright mate, thanks for calling ${business}. Rab speaking. How can I help?`,
    systemPrompt: (business: string) => `You are Rab, the receptionist for ${business}. You have a thick Scottish accent. You are casual, friendly, and use slang like 'mate' and 'cheers'. Keep answers short.`
  },
  
  // 2. THE PRO (Claire) - Scottish Professional
  'pro': {
    name: 'Claire', 
    voiceId: 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6', // ⚠️ PASTE CLAIRE'S ID HERE
    provider: '11labs',
    firstMessage: (business: string) => `Hello, thank you for calling ${business}. This is Claire. How may I assist you today?`,
    systemPrompt: (business: string) => `You are Claire, a professional receptionist for ${business}. You have a polite Scottish accent. Your tone is formal, efficient, and warm. You do not use slang.`
  },

  // 3. THE COACH (Calum) - Scottish Energetic
  'coach': {
    name: 'Calum', 
    voiceId: '1f5287e0-7f42-437c-aa10-ac39bc5171ae', // ⚠️ PASTE CALUM'S ID HERE
    provider: '11labs',
    firstMessage: (business: string) => `Hey! Welcome to ${business}! This is Calum. Ready to get started?`,
    systemPrompt: (business: string) => `You are Calum, a high-energy and motivational assistant for ${business}. You have an energetic Scottish accent. Your tone is enthusiastic and encouraging.`
  }
};

export async function POST(req: Request) {
  try {
    const YOUR_BUNDLE_SID = 'BUf1c5944923fe75b2b3b98629eab0d474'; 
    
    // 1. Get the choice from the frontend (tradie, pro, or coach)
    const { userId, businessName, voiceId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    if (!businessName) return NextResponse.json({ error: 'Business Name required' }, { status: 400 });

    // Default to 'tradie' (Rab) if selection is missing
    const selectedVoice = VOICE_CONFIG[voiceId] || VOICE_CONFIG['tradie'];

    console.log(`🚀 Provisioning '${selectedVoice.name}' for: ${businessName}`);

    // 2. Buy Twilio Number
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });

    if (availableNumbers.length === 0) throw new Error('No UK numbers available');
    const chosenNumber = availableNumbers[0];

    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber.phoneNumber,
      friendlyName: `NessDial: ${businessName} (${selectedVoice.name})`,
      bundleSid: YOUR_BUNDLE_SID, 
    });

    console.log(`✅ Number Purchased: ${purchasedNumber.phoneNumber}`);

    // 3. Create the DEDICATED Assistant (SaaS Magic)
    // We create a specific copy of Calum/Claire just for THIS user
    // so we can hardcode their business name into the prompt.
    const createAssistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${selectedVoice.name} (${businessName})`, 
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: selectedVoice.systemPrompt(businessName)
            }
          ]
        },
        voice: {
          provider: selectedVoice.provider, 
          voiceId: selectedVoice.voiceId 
        },
        firstMessage: selectedVoice.firstMessage(businessName)
      }),
    });

    if (!createAssistantResponse.ok) {
      const errorText = await createAssistantResponse.text();
      throw new Error(`Failed to create Vapi assistant: ${errorText}`);
    }

    const newAssistant = await createAssistantResponse.json();
    const newAssistantId = newAssistant.id;

    // 4. Link Assistant to Number
    const vapiImportResponse = await fetch('https://api.vapi.ai/phone-number/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twilioPhoneNumber: purchasedNumber.phoneNumber,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        assistantId: newAssistantId, 
      }),
    });

    if (!vapiImportResponse.ok) {
      const errorText = await vapiImportResponse.text();
      throw new Error(`Vapi Import Failed: ${errorText}`);
    }

    const vapiData = await vapiImportResponse.json();

    // 5. Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('assistants')
      .insert({
        user_id: userId,
        twilio_phone_number: purchasedNumber.phoneNumber,
        twilio_phone_sid: purchasedNumber.sid,
        vapi_phone_number_id: vapiData.id,
        vapi_assistant_id: newAssistantId,
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, phoneNumber: purchasedNumber.phoneNumber });

  } catch (error: any) {
    console.error('Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}