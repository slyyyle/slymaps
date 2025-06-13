import React from 'react';

interface OSMDescriptionProps {
  address?: string;
  phone?: string;
  website?: string;
  operator?: string;
  brand?: string;
  cuisine?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
}

export const OSMDescription: React.FC<OSMDescriptionProps> = ({
  address,
  phone,
  website,
  operator,
  brand,
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
          className="text-slate-900 hover:underline text-xs"
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
          className="text-blue-600 hover:underline text-xs"
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
        <span className="text-slate-900 text-xs">{operator}</span>
      )
    });
  }

  if (brand) {
    contactItems.push({
      key: 'brand',
      icon: '🏷️',
      content: (
        <span className="text-slate-900 text-xs">{brand}</span>
      )
    });
  }

  if (cuisine) {
    contactItems.push({
      key: 'cuisine',
      icon: '🍽️',
      content: (
        <span className="text-slate-900 text-xs">{cuisine}</span>
      )
    });
  }

  if (amenity) {
    contactItems.push({
      key: 'amenity',
      icon: '🏪',
      content: (
        <span className="text-slate-900 text-xs">Amenity: {amenity}</span>
      )
    });
  }

  if (shop) {
    contactItems.push({
      key: 'shop',
      icon: '🛍️',
      content: (
        <span className="text-slate-900 text-xs">Shop: {shop}</span>
      )
    });
  }

  if (tourism) {
    contactItems.push({
      key: 'tourism',
      icon: '🗺️',
      content: (
        <span className="text-slate-900 text-xs">Tourism: {tourism}</span>
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
    const raw = address || '';
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    // Hide country if it's United States
    if (parts[parts.length - 1] === 'United States') parts.pop();
    // Prepare default lines
    let line1 = parts.join(', ');
    let line2 = '';
    if (parts.length === 3) {
      // Street, city, state+zip -> split state and zip
      const [street, city, stateZip] = parts;
      const szParts = stateZip.split(' ').filter(Boolean);
      const zip = szParts.length > 1 ? szParts.pop()! : '';
      const state = szParts.join(' ');
      line1 = street;
      line2 = [city, state, zip].filter(Boolean).join(', ');
    } else if (parts.length === 2) {
      line1 = parts[0];
      line2 = parts[1];
    }
    allItems.push({
      key: 'address',
      icon: '📍',
      content: (
        <div className="flex flex-col min-w-0">
          <span className="text-slate-900 text-xs">{line1}</span>
          {line2 && <span className="text-slate-900 text-xs">{line2}</span>}
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
    <div className="bg-slate-50 border border-slate-200 rounded text-xs">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const borderClass = isLast ? '' : 'border-b border-slate-200';
        return (
          <div key={item.key} className={`flex items-center gap-2 px-3 py-1 ${borderClass}`}>
          <span className="text-sm flex-shrink-0">{item.icon}</span>
          <div className="min-w-0 flex-1">{item.content}</div>
        </div>
        );
      })}
    </div>
  );
}; 