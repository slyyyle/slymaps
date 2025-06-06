
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { CustomPOI } from '@/types';
import { ScrollArea } from './ui/scroll-area';

interface CustomPoiEditorProps {
  customPois: CustomPOI[];
  onDelete: (poiId: string) => void;
  onSelectPoi: (poi: CustomPOI) => void; 
}

export function CustomPoiEditor({ customPois, onDelete, onSelectPoi }: CustomPoiEditorProps) {

  if (customPois.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-headline">Your Custom POIs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">You haven't added any custom POIs yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-headline">Your Custom POIs</CardTitle>
        </CardHeader>
        <CardContent>
          {customPois.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {customPois.map(poi => (
                  <li key={poi.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <button onClick={() => onSelectPoi(poi)} className="text-left flex-1">
                      <p className="font-medium">{poi.name}</p>
                      <p className="text-xs text-muted-foreground">{poi.type} - ({poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)})</p>
                      {poi.address && <p className="text-xs text-muted-foreground truncate">{poi.address}</p>}
                    </button>
                    <div className="flex gap-1">
                      {/* Edit button removed for now */}
                      <Button variant="ghost" size="icon" onClick={() => onDelete(poi.id)}><Icons.Delete className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
             <p className="text-sm text-muted-foreground text-center py-4">You haven't added any custom POIs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
