import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';
import twilio from 'twilio';

// 1. Initialize Stripe directly here (Fixes Error #1)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any, // Use latest stable version or match your checkout route
});

// Initialize Twilio Client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: Request) {
  const body = await req.text();
  
  // 2. Await headers() (Fixes Error #2)
  const signature = (await headers()).get('Stripe-Signature') as string;

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
    
    // --- CASE 1: SUBSCRIPTION CREATED / UPDATED ---
    case 'checkout.session.completed':
    case 'customer.subscription.updated': {
      const session = event.data.object as any;
      
      // If this is a checkout session, link Stripe Customer ID to User
      if (event.type === 'checkout.session.completed') {
        const userId = session.metadata?.userId;
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

    // --- CASE 2: SUBSCRIPTION CANCELLED (Releases Number) ---
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`❌ Subscription cancelled for Customer: ${customerId}`);

      // A. Find the User
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
        const { data: assistant } = await supabaseAdmin
          .from('assistants')
          .select('vapi_phone_number_id')
          .eq('user_id', userId)
          .single();
        
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