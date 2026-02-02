import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe'; // Ensure you have this export or use the direct init below
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';
import twilio from 'twilio';

// Initialize Twilio Client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  // Handle the events
  switch (event.type) {
    
    // --- 1. SUBSCRIPTION CREATED / UPDATED ---
    case 'checkout.session.completed':
    case 'customer.subscription.updated': {
      const session = event.data.object as any;
      
      // If this is a checkout session, we need to link the Stripe Customer ID to the User
      if (event.type === 'checkout.session.completed') {
        const userId = session.metadata?.userId; // Ensure you pass this in your checkout session creation!
        const customerId = session.customer;

        if (userId && customerId) {
          await supabaseAdmin
            .from('profiles')
            .update({ 
              stripe_customer_id: customerId,
              subscription_status: 'active' 
            })
            .eq('id', userId);
        }
      }
      break;
    }

    // --- 2. SUBSCRIPTION CANCELLED (The Important Part) ---
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`❌ Subscription cancelled for Customer: ${customerId}`);

      // A. Find the User associated with this Stripe Customer
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        const userId = profile.id;

        // B. Update Database Status
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);

        // C. FIND AND RELEASE TWILIO NUMBER
        // We look for the assistant record to get the phone number details
        const { data: assistant } = await supabaseAdmin
          .from('assistants')
          .select('vapi_phone_number_id') // NOTE: You need to ensure you stored the TWILIO SID here or in a separate column
          .eq('user_id', userId)
          .single();

        // ⚠️ CRITICAL: Vapi's "phone_number_id" might be different from Twilio's "SID".
        // If 'vapi_phone_number_id' IS the Twilio SID (starts with PN...), we use it.
        // If not, we should have stored 'twilio_sid' in the assistants table during provisioning.
        
        if (assistant?.vapi_phone_number_id) {
           const phoneSid = assistant.vapi_phone_number_id;
           
           // Only attempt delete if it looks like a Twilio SID (starts with PN)
           if (phoneSid.startsWith('PN')) {
             try {
               await twilioClient.incomingPhoneNumbers(phoneSid).remove();
               console.log(`✅ Released Twilio Number: ${phoneSid}`);
             } catch (err) {
               console.error('Failed to release Twilio number:', err);
             }
           }
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}