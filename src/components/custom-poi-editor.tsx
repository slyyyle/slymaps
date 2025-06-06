
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AddressAutofill, config as mapboxSearchConfig } from '@mapbox/search-js-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription as ShadCnDialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { CustomPOI } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ScrollArea } from './ui/scroll-area';
import { CAPITOL_HILL_COORDS } from '@/lib/constants';

const latitudeSchema = z.preprocess(
  (val) => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  },
  z.number({
    required_error: "Latitude is required. Select a valid address to auto-fill.",
    invalid_type_error: "Latitude must be a valid number.",
  }).min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90.")
);

const longitudeSchema = z.preprocess(
  (val) => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  },
  z.number({
    required_error: "Longitude is required. Select a valid address to auto-fill.",
    invalid_type_error: "Longitude must be a valid number.",
  }).min(-180, "Longitude must be between -180 and 180.").max(180, "Longitude must be between -180 and 180.")
);

const poiSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required (e.g., Home, Work, Favorite Cafe)"),
  address: z.string().min(1, "Address is required. Select a valid address to get coordinates."),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  description: z.string().optional(),
});

type PoiFormData = z.infer<typeof poiSchema>;

interface CustomPoiEditorProps {
  customPois: CustomPOI[];
  onAdd: (poi: CustomPOI) => void;
  onUpdate: (poi: CustomPOI) => void;
  onDelete: (poiId: string) => void;
  onSelectPoi: (poi: CustomPOI) => void;
  mapboxAccessToken: string;
}

export function CustomPoiEditor({ customPois, onAdd, onUpdate, onDelete, onSelectPoi, mapboxAccessToken }: CustomPoiEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<CustomPOI | null>(null);
  const [tokenInitializing, setTokenInitializing] = useState(true);
  const [autofillInputValue, setAutofillInputValue] = useState('');

  const form = useForm<PoiFormData>({
    resolver: zodResolver(poiSchema),
    defaultValues: {
      name: '',
      type: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      description: '',
    }
  });

  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');

  useEffect(() => {
    if (mapboxAccessToken) {
      mapboxSearchConfig.accessToken = mapboxAccessToken;
      setTokenInitializing(false);
    }
  }, [mapboxAccessToken]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingPoi) {
        form.reset({
          name: editingPoi.name,
          type: editingPoi.type,
          address: editingPoi.address || '',
          latitude: editingPoi.latitude,
          longitude: editingPoi.longitude,
          description: editingPoi.description || '',
        });
        setAutofillInputValue(editingPoi.address || '');
      } else {
        form.reset({ name: '', type: '', address: '', latitude: undefined, longitude: undefined, description: '' });
        setAutofillInputValue('');
      }
      form.clearErrors();
    }
  }, [editingPoi, form, isDialogOpen]);

  const handleAddressRetrieve = (response: any) => {
    const feature = response?.features?.[0];
    let newLat: number | undefined = undefined;
    let newLon: number | undefined = undefined;
    let newAddress: string = '';

    if (feature?.properties && feature?.geometry?.coordinates && feature.geometry.coordinates.length === 2) {
      newAddress = feature.properties.formatted_address || feature.properties.name || '';

      const rawLon = feature.geometry.coordinates[0];
      const rawLat = feature.geometry.coordinates[1];

      if (typeof rawLon === 'number' && !isNaN(rawLon)) {
        newLon = rawLon;
      } else if (typeof rawLon === 'string') {
        const parsed = parseFloat(rawLon);
        if (!isNaN(parsed)) newLon = parsed;
      }

      if (typeof rawLat === 'number' && !isNaN(rawLat)) {
        newLat = rawLat;
      } else if (typeof rawLat === 'string') {
        const parsed = parseFloat(rawLat);
        if (!isNaN(parsed)) newLat = parsed;
      }
    }

    // Update RHF state
    form.setValue('address', newAddress, { shouldValidate: true });
    form.setValue('latitude', newLat, { shouldValidate: true });
    form.setValue('longitude', newLon, { shouldValidate: true });
    
    setAutofillInputValue(newAddress); // Update visual input

    // Clear errors only if all parts are valid, otherwise let Zod show specific errors
    if (newAddress && newLat !== undefined && newLon !== undefined) {
      form.clearErrors(['address', 'latitude', 'longitude']);
    } else if (newAddress && (newLat === undefined || newLon === undefined)) {
      // If address was selected but coordinates couldn't be derived
      form.setError('address', { type: 'manual', message: 'Coordinates could not be determined. Try another address.' });
      // The latitude/longitude required_errors from Zod will also show
    }
    // If newAddress is empty, Zod's required_error for address will show
  };


  const onSubmit: SubmitHandler<PoiFormData> = (data) => {
    // Zod validation should have already ensured latitude and longitude are numbers
    // if they passed validation.
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number' || isNaN(data.latitude) || isNaN(data.longitude)) {
      // This case should ideally be caught by Zod, but as a fallback:
      form.setError("address", {type: "manual", message: "Invalid or missing coordinates. Please select a valid address from the suggestions."});
      return;
    }

    const poiData: CustomPOI = {
      id: editingPoi ? editingPoi.id : `custom-${Date.now()}`,
      name: data.name,
      type: data.type,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      isCustom: true as const,
    };

    if (editingPoi) {
      onUpdate(poiData);
    } else {
      onAdd(poiData);
    }
    setIsDialogOpen(false);
    setEditingPoi(null);
  };

  const handleEdit = (poi: CustomPOI) => {
    setEditingPoi(poi);
    setIsDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingPoi(null);
    form.reset({
      name: '', type: '', address: '',
      latitude: undefined, longitude: undefined,
      description: ''
    });
    setAutofillInputValue('');
    form.clearErrors();
    setIsDialogOpen(true);
  };
  
  if (tokenInitializing && !mapboxAccessToken) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing POI Editor...</div>;
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleAddNew} className="w-full">
        <Icons.Add className="mr-2 h-4 w-4" /> Add New Custom POI
      </Button>

      {customPois.length > 0 && (
        <Card>
          <CardHeader>
            <DialogTitle className="text-md">Your Custom POIs</DialogTitle>
          </CardHeader>
          <CardContent>
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
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(poi)}><Icons.Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(poi.id)}><Icons.Delete className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {customPois.length === 0 && (
         <p className="text-sm text-muted-foreground text-center py-4">You haven't added any custom POIs yet.</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            form.clearErrors();
            setEditingPoi(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingPoi ? 'Edit' : 'Add'} Custom POI</DialogTitle>
            <ShadCnDialogDescription>
              {editingPoi ? 'Update the details of your point of interest.' : 'Save a location for quick access. Enter an address and select from suggestions to set coordinates.'}
            </ShadCnDialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Home, Favorite Bakery" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g., Home, Work, Cafe" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                       {!mapboxAccessToken ? (
                          <Input placeholder="Mapbox token missing" disabled />
                       ) : (
                        <AddressAutofill
                          accessToken={mapboxAccessToken}
                          onRetrieve={handleAddressRetrieve}
                          options={{
                            country: "US",
                            language: "en",
                            proximity: [CAPITOL_HILL_COORDS.longitude, CAPITOL_HILL_COORDS.latitude]
                          }}
                        >
                          <Input
                            placeholder="Type an address and select"
                            autoComplete="off"
                            value={autofillInputValue}
                            onChange={(e) => {
                              setAutofillInputValue(e.target.value);
                              // If user clears the input manually after a selection was made,
                              // also clear RHF's address, lat, and lon.
                              if (e.target.value === '') {
                                form.setValue('address', '', { shouldValidate: true });
                                form.setValue('latitude', undefined, { shouldValidate: true });
                                form.setValue('longitude', undefined, { shouldValidate: true });
                                form.clearErrors(['address', 'latitude', 'longitude']);
                              }
                            }}
                          />
                        </AddressAutofill>
                       )}
                    </FormControl>
                    <FormDescription>
                      {(typeof watchedLat === 'number' && !isNaN(watchedLat) && typeof watchedLng === 'number' && !isNaN(watchedLng)) ? (
                        <span className="block text-xs mt-1 text-green-600">
                          Selected Coordinates: Lat: {watchedLat.toFixed(5)}, Lon: {watchedLng.toFixed(5)}
                        </span>
                      ) : (
                        <span className="block text-xs mt-1 text-muted-foreground">
                          Coordinates: Not set. Select a valid address.
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input placeholder="Notes about this place" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={!mapboxAccessToken || form.formState.isSubmitting}>
                  <Icons.Save className="mr-2 h-4 w-4" /> Save POI
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    