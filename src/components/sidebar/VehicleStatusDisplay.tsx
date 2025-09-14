import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { ObaVehicleLocation } from '@/types/transit/oba';
import { useVehicleStopInfo } from '@/hooks/data/use-vehicle-stop-info';

interface VehicleStatusDisplayProps {
	vehicle: ObaVehicleLocation;
	isSelected?: boolean;
	onSelect?: () => void;
	onVehicleHover?: (isHovering: boolean) => void;
}

export function VehicleStatusDisplay({ 
	vehicle, 
	isSelected = false,
	onSelect,
	onVehicleHover 
}: VehicleStatusDisplayProps) {
	const stopInfo = useVehicleStopInfo(vehicle);

	// Countdown for live next-stop ETA in seconds (only for approaching vehicles)
	const [countdown, setCountdown] = useState<number | null>(null);

	const formatTime = (seconds: number): string => {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h`;
	};

	// Simplified situation mapping
	const isArrived = stopInfo.situation === 'at_stop';
	const statusBorderColor = isArrived ? 'border-yellow-500' : 'border-green-500';
	const statusLabel = isArrived ? 'ARRIVED' : 'DRIVING';
	const statusIcon = isArrived ? '🚏' : '→';

	useEffect(() => {
		if (stopInfo.nextStopTimeOffset != null) {
			setCountdown(stopInfo.nextStopTimeOffset);
			const timer = setInterval(() => {
				setCountdown(prev => {
					if (prev == null) return null;
					if (prev <= 1) {
						clearInterval(timer);
						return null;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearInterval(timer);
		} else {
			setCountdown(null);
		}
	}, [stopInfo.nextStopTimeOffset]);

	const handleClick = () => {
		onSelect?.();
		onVehicleHover?.(true);
	};

	const baseClasses = `p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isSelected ? 'bg-primary/20 ' : ''}`;
	const finalClassName = `${baseClasses}${statusBorderColor}`;

	return (
		<div
			className={finalClassName}
			onClick={handleClick}
		>
			{/* Header with vehicle ID and status indicators */}
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-2 min-w-0">
					<div className="flex items-center gap-1 text-sm font-medium min-w-0">
						<Icons.Bus className="h-4 w-4 text-current" />
						<span className="truncate max-w-[10rem] md:max-w-[14rem]">
							{vehicle.id.split('_').pop()}
						</span>
					</div>
				</div>
				<span className="text-xs font-bold uppercase flex items-center gap-1">
					{statusLabel}
					<span className="text-lg">{statusIcon}</span>
				</span>
			</div>

			{/* Main status */}
			<div className="flex items-center justify-between">
				<div className="font-medium text-xs truncate">
					{stopInfo.currentStopName || stopInfo.nextStopName || (isArrived ? 'At stop' : 'In transit')}
				</div>
				{!isArrived && countdown != null && (
					<div className="text-xs text-gray-600 ml-2 whitespace-nowrap">{formatTime(countdown)}</div>
				)}
			</div>
		</div>
	);
} 