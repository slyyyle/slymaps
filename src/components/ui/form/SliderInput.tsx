import React, { useMemo } from 'react';
import { cn } from '@/lib/cn';
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

export const SliderInput: React.FC<SliderInputProps> = ({ id, label, min, max, step, value, onValueChange, className }) => {
  const valueArray = useMemo(() => [value], [value]);
  return (
    <div className={cn(className, 'flex flex-col gap-2')}>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={valueArray}
        onValueChange={([v]) => onValueChange(v)}
      />
    </div>
  );
}; 