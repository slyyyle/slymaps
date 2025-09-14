import { NextRequest, NextResponse } from 'next/server';

// Nominatim API endpoint
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Rate limiting: Store last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests per Nominatim usage policy

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lon' },
        { status: 400 }
      );
    }

    // Basic rate limiting to respect Nominatim's usage policy
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      return NextResponse.json(
        { error: `Rate limit: Please wait ${waitTime}ms before next request` },
        { status: 429 }
      );
    }
    lastRequestTime = now;

    // Build Nominatim request URL
    const nominatimParams = new URLSearchParams({
      lat,
      lon,
      format: 'jsonv2',
      addressdetails: '1'
    });

    // Add User-Agent header as required by Nominatim
    const response = await fetch(`${NOMINATIM_URL}/reverse?${nominatimParams}`, {
      headers: {
        'User-Agent': 'Slymaps/1.0 (https://github.com/yourusername/slymaps)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Nominatim API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the response with proper CORS headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 