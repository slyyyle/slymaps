"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Icons } from '@/components/icons';

interface PoiCategoryFilterProps {
  onFilterChange: (filters: PoiFilterSettings) => void;
  onClose: () => void;
}

export interface PoiFilterSettings {
  showLabels: boolean;
  showTransit: boolean;
  showPlaces: boolean;
  selectedCategories: Set<string>;
  minZoom: number;
}

const POI_CATEGORIES = {
  "Food & Drink": {
    icon: "UtensilsCrossed",
    categories: ["restaurant", "cafe", "bar", "fast_food", "food_court", "bakery", "ice_cream"]
  },
  "Shopping": {
    icon: "Store", 
    categories: ["store", "shopping_mall", "supermarket", "convenience_store", "clothing_store", "electronics_store"]
  },
  "Services": {
    icon: "Building2",
    categories: ["bank", "atm", "gas_station", "car_repair", "pharmacy", "hospital", "dentist", "veterinary"]
  },
  "Entertainment": {
    icon: "Film",
    categories: ["cinema", "museum", "park", "gym", "library", "theater", "amusement_park"]
  },
  "Transportation": {
    icon: "Train",
    categories: ["subway_station", "bus_station", "parking", "taxi_stand", "car_rental", "airport"]
  },
  "Lodging": {
    icon: "Building",
    categories: ["hotel", "motel", "hostel", "guest_house", "camping"]
  },
  "Education": {
    icon: "GraduationCap",
    categories: ["school", "university", "college", "kindergarten", "driving_school"]
  },
  "Health": {
    icon: "Hospital",
    categories: ["hospital", "clinic", "pharmacy", "dentist", "veterinary", "spa"]
  }
} as const;

export function PoiCategoryFilter({ onFilterChange, onClose }: PoiCategoryFilterProps) {
  const [showLabels, setShowLabels] = useState(true);
  const [showTransit, setShowTransit] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [minZoom, setMinZoom] = useState(12);

  const handleFilterChange = React.useCallback(() => {
    onFilterChange({
      showLabels,
      showTransit,
      showPlaces,
      selectedCategories,
      minZoom
    });
  }, [onFilterChange, showLabels, showTransit, showPlaces, selectedCategories, minZoom]);

  React.useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  const toggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const selectAllInGroup = (groupCategories: readonly string[]) => {
    const newSelected = new Set(selectedCategories);
    groupCategories.forEach(cat => newSelected.add(cat));
    setSelectedCategories(newSelected);
  };

  const deselectAllInGroup = (groupCategories: readonly string[]) => {
    const newSelected = new Set(selectedCategories);
    groupCategories.forEach(cat => newSelected.delete(cat));
    setSelectedCategories(newSelected);
  };

  const selectAll = () => {
    const allCategories = new Set<string>();
    Object.values(POI_CATEGORIES).forEach(group => {
      group.categories.forEach(cat => allCategories.add(cat));
    });
    setSelectedCategories(allCategories);
  };

  const deselectAll = () => {
    setSelectedCategories(new Set());
  };

  return (
    <Card className="w-80 max-h-96">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">POI Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Global Map Controls */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Map Labels</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm">POI Labels</span>
            <Switch checked={showLabels} onCheckedChange={setShowLabels} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Transit Labels</span>
            <Switch checked={showTransit} onCheckedChange={setShowTransit} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Place Labels</span>
            <Switch checked={showPlaces} onCheckedChange={setShowPlaces} />
          </div>
        </div>

        <Separator />

        {/* Category Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Categories</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-6 px-2">
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-6 px-2">
                None
              </Button>
            </div>
          </div>

          <ScrollArea className="h-48">
            <Accordion type="multiple" className="w-full">
              {Object.entries(POI_CATEGORIES).map(([groupName, group]) => {
                const IconComponent = Icons[group.icon as keyof typeof Icons] || Icons.MapPin;
                const selectedInGroup = group.categories.filter(cat => selectedCategories.has(cat)).length;
                const totalInGroup = group.categories.length;
                
                return (
                  <AccordionItem key={groupName} value={groupName} className="border-0">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm">{groupName}</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedInGroup}/{totalInGroup}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="space-y-1 pb-2">
                      <div className="flex gap-1 mb-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => selectAllInGroup(group.categories)}
                          className="text-xs h-5 px-2"
                        >
                          All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deselectAllInGroup(group.categories)}
                          className="text-xs h-5 px-2"
                        >
                          None
                        </Button>
                      </div>
                      {group.categories.map(category => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
                          <Switch 
                            checked={selectedCategories.has(category)}
                            onCheckedChange={() => toggleCategory(category)}
                          />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        </div>

        <Separator />

        {/* Zoom Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Min Zoom Level</span>
            <Badge variant="outline">{minZoom}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setMinZoom(Math.max(8, minZoom - 1))}
              disabled={minZoom <= 8}
            >
              <Icons.Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center text-sm">
              Zoom {minZoom}+
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setMinZoom(Math.min(18, minZoom + 1))}
              disabled={minZoom >= 18}
            >
              <Icons.Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="text-xs text-muted-foreground">
          {selectedCategories.size} categories selected
        </div>
      </CardContent>
    </Card>
  );
} 