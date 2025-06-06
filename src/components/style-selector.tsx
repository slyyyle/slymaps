"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { MapStyle } from '@/types';
import { Icons } from './icons';

interface StyleSelectorProps {
  styles: MapStyle[];
  currentStyleId: string;
  onStyleChange: (styleId: string) => void;
}

export function StyleSelector({ styles, currentStyleId, onStyleChange }: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="map-style-select" className="flex items-center"><Icons.MapStyle className="mr-2 h-4 w-4" /> Map Style</Label>
      <Select value={currentStyleId} onValueChange={onStyleChange}>
        <SelectTrigger id="map-style-select" className="w-full">
          <SelectValue placeholder="Select map style" />
        </SelectTrigger>
        <SelectContent>
          {styles.map(style => (
            <SelectItem key={style.id} value={style.id}>
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
