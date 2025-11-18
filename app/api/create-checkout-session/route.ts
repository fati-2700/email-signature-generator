import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST() {
  try {
    // Verificar que la clave secreta de Stripe esté configurada
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });

    // Price ID del producto
    const priceId = 'price_1SUrkILgUfKW5q1JIzIxYFJz';

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/generator?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/generator?payment=cancelled`,
      metadata: {
        product: 'signatureflow_pro',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

