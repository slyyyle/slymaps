import addressFormatter from '@fragaria/address-formatter';

export type AddressInput =
  | string
  | {
      house_number?: string;
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      county?: string;
      state?: string;
      postcode?: string;
      country?: string;
      country_code?: string;
    };

export function formatAddressLines(address: AddressInput): string[] {
  if (!address) return [];
  // If passed a raw string, split on commas
  if (typeof address === 'string') {
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    // Remove trailing country if it's United States
    if (parts[parts.length - 1] === 'United States') parts.pop();
    if (parts.length === 3) {
      const [street, city, stateZip] = parts;
      const sz = stateZip.split(' ').filter(Boolean);
      const zip = sz.length > 1 ? sz.pop()! : '';
      const state = sz.join(' ');
      return [street, [city, state, zip].filter(Boolean).join(', ')];
    }
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return [parts.join(', ')];
  }

  // Structured address object: use addressFormatter
  // Map fields from snake_case to camelCase expected by fragaria
  const formattedRaw = addressFormatter.format(
    {
      houseNumber: address.house_number,
      road: address.road,
      neighbourhood: address.neighbourhood || address.suburb,
      city: address.city || address.county,
      state: address.state,
      postcode: address.postcode,
      country: address.country,
      countryCode: address.country_code?.toUpperCase(),
    },
    { output: 'array' }
  ) as string | string[];

  // Fragaria may return a single string or array
  if (Array.isArray(formattedRaw)) {
    return formattedRaw;
  }
  // formattedRaw is string here
  return formattedRaw
    .split('\n')
    .filter((line: string) => line.trim());
}

// Add variant-based formatter for street / city / zip layouts
export type AddressVariant = 'single' | 'double' | 'triple';
export function formatAddressByVariant(
  address: AddressInput,
  variant: AddressVariant
): string[] {
  if (!address) return [];
  // For raw strings, fallback to default formatter
  if (typeof address === 'string') {
    return formatAddressLines(address);
  }

  const street = [address.house_number, address.road].filter(Boolean).join(' ');
  const city = address.city || '';
  const zip = address.postcode || '';

  switch (variant) {
    case 'single': {
      const second = [city, zip].filter(Boolean).join(' ');
      const line = [street, second].filter(Boolean).join(', ');
      return line ? [line] : [];
    }
    case 'double': {
      const line1 = street;
      const line2 = [city, zip].filter(Boolean).join(' ');
      return [line1, line2].filter(Boolean);
    }
    case 'triple': {
      const line1 = street;
      const line2 = city;
      const line3 = zip;
      return [line1, line2, line3].filter(Boolean);
    }
    default:
      return formatAddressLines(address);
  }
} 