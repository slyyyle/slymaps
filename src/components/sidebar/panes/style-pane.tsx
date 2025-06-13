import React from 'react';
import { PaneHeader } from '../shared/pane-header';
import { ThemeSelector } from '../../map/ThemeSelector';
import { useThemeStore } from '../../../stores/theme-store';

interface StylePaneProps {
  onBack: () => void;
}

export function StylePane({ onBack }: StylePaneProps) {
  const { popupTheme, setTheme } = useThemeStore();

  return (
    <div className="flex flex-col h-full">
      <PaneHeader 
        title="Map Style" 
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Interface Themes</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose a theme for the sidebar, popups, and overlays
            </p>
            <ThemeSelector 
              currentTheme={popupTheme}
              onThemeChange={setTheme}
            />
          </div>
          
          <div className="text-center text-muted-foreground">
            <p className="text-xs">More map style options coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 