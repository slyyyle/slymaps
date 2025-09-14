import { NextRequest, NextResponse } from 'next/server';

// Overpass endpoints (primary + fallbacks)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

export const runtime = 'nodejs';

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let bodyText = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      bodyText = await request.text();
    } else if (contentType.includes('application/json')) {
      const json = await request.json();
      // Expect { data: 'QL' }
      const data = typeof json?.data === 'string' ? json.data : '';
      bodyText = `data=${encodeURIComponent(data)}`;
    } else {
      // Try to read raw body as text
      bodyText = await request.text();
    }

    if (!bodyText || !bodyText.includes('data=')) {
      return NextResponse.json({ error: 'Missing Overpass QL data' }, { status: 400 });
    }

    // Try endpoints with a short per-endpoint timeout, falling over quickly
    let lastError: any = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Slymaps/1.0 (https://github.com/yourusername/slymaps)'
          },
          body: bodyText,
        }, 5000);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, {
            headers: {
              'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
            }
          });
        }

        // If 429/5xx, try next endpoint
        lastError = new Error(`Overpass error ${res.status}`);
        if (res.status >= 500 || res.status === 429) continue;
        // For other status codes, break and return
        return NextResponse.json({ error: `Overpass error ${res.status}` }, { status: res.status });
      } catch (e: any) {
        lastError = e?.name === 'AbortError' ? new Error('Overpass request timed out') : e;
        // Try next endpoint
      }
    }

    return NextResponse.json({ error: 'All Overpass endpoints failed', details: String(lastError) }, { status: 502 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 