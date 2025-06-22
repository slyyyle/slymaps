import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { findNearbyTransit } from '@/services/oba'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const radius = parseInt(searchParams.get('radius') ?? '200', 10)

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ stops: [] })
  }

  try {
    const data = await findNearbyTransit({ latitude: lat, longitude: lon }, radius)
    return NextResponse.json(data)
  } catch (err) {
    console.error('OBA proxy error:', err)
    return NextResponse.json({ stops: [] })
  }
} 