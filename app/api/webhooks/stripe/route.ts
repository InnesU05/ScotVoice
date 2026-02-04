import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

// Initialize Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // 1. Handle NEW Subscription
  if (event.type === 'checkout.session.completed') {
    const subscriptionId = session.subscription as string;
    const userId = session.metadata?.userId;

    if (!userId) {
      return new NextResponse('User ID missing', { status: 400 });
    }

    // Activate Profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    // Initialize Assistant Record
    await supabaseAdmin
      .from('assistants')
      .upsert({ 
          user_id: userId, 
          active_voice_id: 'tradie' 
      }, { onConflict: 'user_id' });
  }

  // 2. Handle CANCELLATION (Release the Number)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    
    // A. Find the User
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
    
    if (profile) {
        console.log(`❌ Subscription cancelled for user: ${profile.id}`);

        // B. Find their Phone Number
        const { data: assistant } = await supabaseAdmin
            .from('assistants')
            .select('twilio_phone_number')
            .eq('user_id', profile.id)
            .single();

        // C. Release Number from Twilio
        if (assistant?.twilio_phone_number) {
            try {
                // 1. Find the SID (ID) of this phone number
                const numbers = await twilioClient.incomingPhoneNumbers.list({
                    phoneNumber: assistant.twilio_phone_number,
                    limit: 1
                });

                if (numbers.length > 0) {
                    // 2. Delete it from Twilio
                    await twilioClient.incomingPhoneNumbers(numbers[0].sid).remove();
                    console.log(`📞 Released Twilio Number: ${assistant.twilio_phone_number}`);
                }
            } catch (err) {
                console.error("Failed to release Twilio number:", err);
            }
        }

        // D. Mark as Canceled & Clear Number in DB
        await supabaseAdmin.from('profiles')
            .update({ subscription_status: 'canceled' })
            .eq('id', profile.id);
            
        await supabaseAdmin.from('assistants')
            .update({ twilio_phone_number: null }) // Remove number from record
            .eq('user_id', profile.id);
    }
  }

  return new NextResponse(null, { status: 200 });
}