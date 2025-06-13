"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { key: 'mapbox-popup-container dark', label: '🌙 Dark Glass', description: 'Cool dark with blue accents' },
  { key: 'mapbox-popup-container midnight', label: '🌌 Midnight', description: 'Deep space vibes' },
  { key: 'mapbox-popup-container neon', label: '💜 Neon Purple', description: 'Cyberpunk style' },
  { key: 'mapbox-popup-container ocean', label: '🌊 Ocean', description: 'Deep blue-green' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {themes.map((theme) => (
          <Button
            key={theme.key}
            variant={currentTheme === theme.key ? "default" : "outline"}
            size="sm"
            onClick={() => onThemeChange(theme.key)}
            className="justify-start h-auto p-3 text-left"
          >
            <div className="w-full">
              <div className="font-medium text-sm">{theme.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{theme.description}</div>
            </div>
          </Button>
        ))}
      </div>
      <Badge variant="secondary" className="text-xs">
        Applies to both sidebar and popups!
      </Badge>
    </div>
  );
};

export default ThemeSelector; 