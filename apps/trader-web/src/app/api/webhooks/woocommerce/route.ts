import { API_BASE_URL } from '@/lib/api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE_URL}/webhooks/woocommerce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fundedgiants-signature': req.headers.get('x-fundedgiants-signature') || '',
        'x-wc-webhook-signature': req.headers.get('x-wc-webhook-signature') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message || 'Webhook forwarding failed' },
      { status: 500 }
    );
  }
}