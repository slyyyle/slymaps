import React from 'react';
import { Label } from '@/components/ui/label';

export interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({ id, label, value, onChange, className }) => (
  <div className={className}>
    <Label htmlFor={id} className="text-xs">
      {label}
    </Label>
    <input
      id={id}
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full h-10 p-0 border border-input rounded-md"
    />
  </div>
); 