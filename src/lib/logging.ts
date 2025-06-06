/**
 * Centralized logging utilities with consistent emoji-based prefixes
 * for better visual organization in the console
 */

export const log = {
  // Data & API Operations
  osm: (message: string, ...args: any[]) => console.log(`🗺️ ${message}`, ...args),
  api: (message: string, ...args: any[]) => console.log(`🚀 ${message}`, ...args),
  data: (message: string, ...args: any[]) => console.log(`📊 ${message}`, ...args),
  
  // Map & Visual Features
  map: (message: string, ...args: any[]) => console.log(`🌍 ${message}`, ...args),
  lighting: (message: string, ...args: any[]) => console.log(`🌅 ${message}`, ...args),
  lighting3d: (message: string, ...args: any[]) => console.log(`🌟 ${message}`, ...args),
  buildings: (message: string, ...args: any[]) => console.log(`🏢 ${message}`, ...args),
  satellite: (message: string, ...args: any[]) => console.log(`🛰️ ${message}`, ...args),
  poi: (message: string, ...args: any[]) => console.log(`🎯 ${message}`, ...args),
  
  // Transport & Navigation
  directions: (message: string, ...args: any[]) => console.log(`🗺️ ${message}`, ...args),
  bus: (message: string, ...args: any[]) => console.log(`🚌 ${message}`, ...args),
  
  // System States
  success: (message: string, ...args: any[]) => console.log(`✅ ${message}`, ...args),
  warning: (message: string, ...args: any[]) => console.warn(`⚠️ ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`❌ ${message}`, ...args),
  
  // Development & Testing
  test: (message: string, ...args: any[]) => console.log(`🧪 ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.log(`🔍 ${message}`, ...args),
  
  // UI States & Actions
  ui: (message: string, ...args: any[]) => console.log(`🎨 ${message}`, ...args),
  control: (message: string, ...args: any[]) => console.log(`🔄 ${message}`, ...args),
  time: (message: string, ...args: any[]) => console.log(`🕐 ${message}`, ...args),
  
  // Generic fallback
  info: (message: string, ...args: any[]) => console.log(`ℹ️ ${message}`, ...args),
} as const; 