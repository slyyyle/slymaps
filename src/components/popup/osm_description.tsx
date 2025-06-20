import React from 'react';
import { formatAddressLines, formatAddressByVariant, AddressVariant } from '@/utils/address-utils';
import type { AddressInput } from '@/utils/address-utils';

interface OSMDescriptionProps {
  address?: AddressInput;
  /** If set, overrides default multi-line formatting */
  variant?: AddressVariant;
  phone?: string;
  website?: string;
  operator?: string;
  cuisine?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
}

export const OSMDescription: React.FC<OSMDescriptionProps> = ({
  address,
  variant,
  phone,
  website,
  operator,
  cuisine,
  amenity,
  shop,
  tourism
}) => {
  // Format phone number for display
  const formatPhone = (phone: string) => {
    // Simple US phone formatting (can be enhanced for international)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1-${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return as-is if not 10 digits
  };

  // Format website URL
  const formatWebsiteUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const getWebsiteDisplayText = (url: string) => {
    try {
      const urlObj = new URL(formatWebsiteUrl(url));
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const contactItems = [];

  // Add business info items
  if (phone) {
    contactItems.push({
      key: 'phone',
      icon: '📞',
      content: (
        <a
          href={`tel:${phone}`}
          className="hover:underline text-xs"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {formatPhone(phone)}
        </a>
      )
    });
  }

  if (website) {
    contactItems.push({
      key: 'website',
      icon: '🌐',
      content: (
        <a
          href={formatWebsiteUrl(website)}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-xs"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {getWebsiteDisplayText(website)}
        </a>
      )
    });
  }

  if (operator) {
    contactItems.push({
      key: 'operator',
      icon: '🏢',
      content: (
        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>{operator}</span>
      )
    });
  }

  if (cuisine) {
    contactItems.push({
      key: 'cuisine',
      icon: '🍽️',
      content: (
        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>{cuisine}</span>
      )
    });
  }

  if (amenity) {
    contactItems.push({
      key: 'amenity',
      icon: '🏪',
      content: (
        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>Amenity: {amenity}</span>
      )
    });
  }

  if (shop) {
    contactItems.push({
      key: 'shop',
      icon: '🛍️',
      content: (
        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>Shop: {shop}</span>
      )
    });
  }

  if (tourism) {
    contactItems.push({
      key: 'tourism',
      icon: '🗺️',
      content: (
        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>Tourism: {tourism}</span>
      )
    });
  }

  // Don't render if no contact items and no address
  if (!address && contactItems.length === 0) {
    return null;
  }

  // Inline refactor: Single container with border dividers (no padding between items)
  const allItems = [];
  
  // Add address first if it exists
  if (address) {
    const lines = variant
      ? formatAddressByVariant(address, variant)
      : formatAddressLines(address);
    allItems.push({
      key: 'address',
      icon: '📍',
      content: (
        <div className="flex flex-col min-w-0" style={{ color: 'hsl(var(--foreground))' }}>
          {lines.map((line, idx) => (
            <span key={idx} className="text-xs">{line}</span>
          ))}
        </div>
      )
    });
  }
  
  // Add all contact items
  allItems.push(...contactItems);

  if (allItems.length === 0) {
    return null;
  }

  return (
    <div className="text-xs">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return (
          <div
            key={item.key}
            className="flex items-center gap-2 px-2 py-0.5"
            style={{ borderBottom: isLast ? undefined : '1px solid hsl(var(--border))' }}
          >
            <span
              className="text-sm flex-shrink-0"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >{item.icon}</span>
            <div className="min-w-0 flex-1" style={{ color: 'hsl(var(--foreground))' }}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 