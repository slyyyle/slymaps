import React from 'react';
import { PaneHeader } from '../shared/pane-header';

interface TransitPaneProps {
  onBack: () => void;
}

export function TransitPane({ onBack }: TransitPaneProps) {
  return (
    <div className="flex flex-col h-full">
      <PaneHeader 
        title="Transit" 
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <p>Simplified transit interface coming soon...</p>
            <p className="text-xs mt-2">Will replace the complex TransitBrowser</p>
          </div>
        </div>
      </div>
    </div>
  );
} 