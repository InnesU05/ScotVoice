import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';
import twilio from 'twilio';

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

// 2. Initialize Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  // Handle the events
  switch (event.type) {
    
    // ====================================================
    // CASE 1: NEW SUBSCRIPTION (Link User to Stripe)
    // ====================================================
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const userId = session.metadata?.userId;
      const customerId = session.customer;

      if (userId && customerId) {
        await supabaseAdmin
          .from('profiles')
          .update({ 
            stripe_customer_id: customerId,
            subscription_status: 'active',
            usage_minutes: 0, // Ensure they start fresh
            monthly_usage_limit: 200 // Set default limit
          })
          .eq('id', userId);
        console.log(`✅ Linked User ${userId} to Customer ${customerId}`);
      }
      break;
    }

    // ====================================================
    // CASE 2: MONTHLY RENEWAL (Reset Minutes)
    // ====================================================
    case 'invoice.payment_succeeded': {
      // 🛠️ FIX: Cast to 'any' to avoid TS error about 'subscription' property
      const invoice = event.data.object as any; 
      const customerId = invoice.customer as string;

      // Check if this is a subscription renewal (not a one-off charge)
      // 'subscription_cycle' means it's a monthly renewal. 
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        console.log(`💰 Monthly Payment Succeeded for: ${customerId}`);

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (profile) {
            // RESET THE MINUTES
            await supabaseAdmin
                .from('profiles')
                .update({ 
                    usage_minutes: 0,
                    last_reset_date: new Date().toISOString()
                })
                .eq('id', profile.id);
            
            console.log(`🔄 Minutes reset to 0 for User ${profile.id}`);
        }
      }
      break;
    }

    // ====================================================
    // CASE 3: CANCELLATION (Release Number)
    // ====================================================
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`❌ Subscription cancelled for: ${customerId}`);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        const userId = profile.id;

        // Mark as cancelled
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);

        // Find and Release Twilio Number
        const { data: assistant } = await supabaseAdmin
          .from('assistants')
          .select('vapi_phone_number_id')
          .eq('user_id', userId)
          .single();
        
        if (assistant?.vapi_phone_number_id) {
           const phoneSid = assistant.vapi_phone_number_id;
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