import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export interface SliderInputProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export const SliderInput: React.FC<SliderInputProps> = ({ id, label, min, max, step, value, onValueChange, className }) => (
  <div className={className}>
    <Label htmlFor={id} className="text-xs">
      {label}
    </Label>
    <Slider
      id={id}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
    />
  </div>
); 