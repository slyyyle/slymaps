"use client";

import React, { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { sidebarTheme } = useThemeStore();
  
  useEffect(() => {
    // Extract theme name from the full sidebar theme class
    // e.g., "sidebar-container dark" -> "theme-dark"
    // e.g., "sidebar-container midnight" -> "theme-midnight"
    
    const themeClass = sidebarTheme.split(' ').pop(); // Get the last part (theme name)
    const globalThemeClass = `theme-${themeClass}`;
    
    // Remove any existing theme classes
    document.body.classList.remove(
      'theme-dark',
      'theme-midnight', 
      'theme-neon',
      'theme-ocean'
    );
    
    // Add the new theme class
    if (themeClass && themeClass !== 'sidebar-container') {
      document.body.classList.add(globalThemeClass);
    }
    
    console.log(`🎨 Applied global theme: ${globalThemeClass} (from ${sidebarTheme})`);
    
  }, [sidebarTheme]);
  
  return <>{children}</>;
} 