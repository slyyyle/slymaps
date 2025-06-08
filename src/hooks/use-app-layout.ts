import { useState, useMemo } from 'react';

export function useAppLayout(
  isLoadingArrivals: boolean,
  isLoadingObaRouteGeometry: boolean,
  isLoadingObaVehicles: boolean
) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allowSidebarClose, setAllowSidebarClose] = useState(false);

  const isSidebarBusy = useMemo(() => {
    return isLoadingArrivals || isLoadingObaRouteGeometry || isLoadingObaVehicles;
  }, [isLoadingArrivals, isLoadingObaRouteGeometry, isLoadingObaVehicles]);

  const handleSidebarToggle = (open: boolean) => {
    if (!open && !allowSidebarClose) {
      return; // Prevent closing unless explicitly allowed
    }
    setSidebarOpen(open);
    setAllowSidebarClose(false); // Reset the flag
  };

  const handleSidebarClose = () => {
    setAllowSidebarClose(true);
    setSidebarOpen(false);
  };

  return {
    // State
    sidebarOpen,
    allowSidebarClose,
    isSidebarBusy,
    
    // Actions
    setSidebarOpen,
    setAllowSidebarClose,
    handleSidebarToggle,
    handleSidebarClose,
  };
} 