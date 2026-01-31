import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Twilio from 'twilio';

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = 'force-dynamic';

// --- 🧬 BLUEPRINT IDs ---
// These are the "Master" assistants you created in Vapi.
// The code will CLONE these and fill in the business name.
const BLUEPRINT_IDS: Record<string, string> = {
  // 1. COACH (Calum) - ID you just provided
  'coach': '1f5287e0-7f42-437c-aa10-ac39bc5171ae', 

  // 2. TRADIE (Rab) - The ID you gave earlier (Ensure this has {{business_name}} in its prompt too!)
  'tradie': '6af03c9c-2797-4818-8dfc-eb604c247f3d',

  // 3. PRO (Claire) - ⚠️ PASTE CLAIRE'S ID HERE
  'pro': 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6' 
};

export async function POST(req: Request) {
  try {
    const YOUR_BUNDLE_SID = 'BUf1c5944923fe75b2b3b98629eab0d474'; 
    const { userId, businessName, voiceId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    if (!businessName) return NextResponse.json({ error: 'Business Name required' }, { status: 400 });

    // 1. Identify the Blueprint
    const blueprintId = BLUEPRINT_IDS[voiceId] || BLUEPRINT_IDS['tradie'];
    console.log(`🚀 Provisioning '${voiceId}' using Blueprint: ${blueprintId}`);

    // 2. FETCH the Blueprint from Vapi (Download your dashboard settings)
    const blueprintResponse = await fetch(`https://api.vapi.ai/assistant/${blueprintId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` 
      }
    });

    if (!blueprintResponse.ok) {
      throw new Error(`Failed to fetch blueprint assistant: ${await blueprintResponse.text()}`);
    }

    const blueprint = await blueprintResponse.json();

    // 3. PREPARE THE NEW ASSISTANT (The "Stamp" Logic)
    // We take your prompt and replace {{business_name}} with the real name.
    
    // a. Fix System Prompt
    let systemMessage = blueprint.model.messages.find((m: any) => m.role === 'system')?.content || "";
    systemMessage = systemMessage.replace(/{{business_name}}/g, businessName);

    // b. Fix First Message
    let firstMessage = blueprint.firstMessage || "";
    firstMessage = firstMessage.replace(/{{business_name}}/g, businessName);

    // c. Construct the New Payload (Keeping your Voice/Model/Transcriber settings)
    const newAssistantPayload = {
      ...blueprint, // Copy EVERYTHING (Voice, Transcriber, Server URL, etc.)
      name: `${blueprint.name} (${businessName})`, // Unique Name for Dashboard
      firstMessage: firstMessage,
      model: {
        ...blueprint.model,
        messages: [
          { role: 'system', content: systemMessage },
          // Keep other messages if they exist (rare for Vapi assistants)
          ...blueprint.model.messages.filter((m: any) => m.role !== 'system') 
        ]
      },
      // Remove ID fields so Vapi creates a NEW one
      id: undefined,
      orgId: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };

    // 4. CREATE the Dedicated Assistant
    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAssistantPayload),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create cloned assistant: ${await createResponse.text()}`);
    }

    const newAssistant = await createResponse.json();
    const newAssistantId = newAssistant.id;
    console.log(`✅ Cloned & Stamped Assistant: ${newAssistantId}`);

    // 5. BUY NUMBER & LINK (Standard Logic)
    const availableNumbers = await twilioClient.availablePhoneNumbers('GB')
      .mobile
      .list({ limit: 1 });
    
    if (availableNumbers.length === 0) throw new Error('No UK numbers available');
    const chosenNumber = availableNumbers[0];

    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber.phoneNumber,
      friendlyName: `NessDial: ${businessName} (${voiceId})`,
      bundleSid: YOUR_BUNDLE_SID, 
    });

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

    if (!vapiImportResponse.ok) throw new Error(`Vapi Import Failed: ${await vapiImportResponse.text()}`);
    const vapiData = await vapiImportResponse.json();

    // 6. SAVE TO DATABASE
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