
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AddressAutofill, config as mapboxSearchConfig } from '@mapbox/search-js-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { CustomPOI } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  onSelectPoi: (poi: CustomPOI) => void; // For map interaction
  mapboxAccessToken: string;
}

export function CustomPoiEditor({ customPois, onAdd, onUpdate, onDelete, onSelectPoi, mapboxAccessToken }: CustomPoiEditorProps) {
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

  // Effect to reset form when editingPoi changes (e.g., user clicks "edit" or "add new")
  useEffect(() => {
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
  }, [editingPoi, form]);


  const handleAddressRetrieve = (response: any) => {
    const feature = response?.features?.[0];
    let newLat: number | undefined = undefined;
    let newLon: number | undefined = undefined;
    let retrievedAddress: string = '';

    if (feature?.properties && feature?.geometry?.coordinates && feature.geometry.coordinates.length === 2) {
      retrievedAddress = feature.properties.formatted_address || feature.properties.name || '';

      const rawLon = feature.geometry.coordinates[0];
      const rawLat = feature.geometry.coordinates[1];

      if (typeof rawLon === 'number' && !isNaN(rawLon)) newLon = rawLon;
      else if (typeof rawLon === 'string') { const parsed = parseFloat(rawLon); if (!isNaN(parsed)) newLon = parsed; }

      if (typeof rawLat === 'number' && !isNaN(rawLat)) newLat = rawLat;
      else if (typeof rawLat === 'string') { const parsed = parseFloat(rawLat); if (!isNaN(parsed)) newLat = parsed; }
    }

    form.setValue('address', retrievedAddress, { shouldValidate: true });
    form.setValue('latitude', newLat, { shouldValidate: true });
    form.setValue('longitude', newLon, { shouldValidate: true });
    setAutofillInputValue(retrievedAddress);

    if (retrievedAddress && (newLat === undefined || newLon === undefined)) {
      form.setError('address', { type: 'manual', message: 'Coordinates could not be determined. Try another address.' });
    } else if (retrievedAddress && newLat !== undefined && newLon !== undefined) {
      form.clearErrors(['address', 'latitude', 'longitude']);
    }
  };

  const onSubmit: SubmitHandler<PoiFormData> = (data) => {
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number' || isNaN(data.latitude) || isNaN(data.longitude)) {
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
    // Reset form and editing state
    setEditingPoi(null);
    form.reset({ name: '', type: '', address: '', latitude: undefined, longitude: undefined, description: '' });
    setAutofillInputValue('');
    form.clearErrors();
  };

  const handleSetEditMode = (poi: CustomPOI) => {
    setEditingPoi(poi); // This will trigger the useEffect to populate the form
    onSelectPoi(poi); // Also notify parent for map interaction
  };
  
  const handleSetNewMode = () => {
    setEditingPoi(null); // This will trigger the useEffect to clear the form
  };

  const handleCancelOrClearForm = () => {
    setEditingPoi(null); // Clears edit mode and form via useEffect
  };
  
  if (tokenInitializing && !mapboxAccessToken) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing POI Editor...</div>;
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSetNewMode} className="w-full">
        <Icons.Add className="mr-2 h-4 w-4" /> 
        {editingPoi ? 'Switch to Add New POI' : 'Add New Custom POI'}
      </Button>

      {customPois.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md font-headline">Your Custom POIs</CardTitle>
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
                      <Button variant="ghost" size="icon" onClick={() => handleSetEditMode(poi)}><Icons.Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(poi.id)}><Icons.Delete className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {customPois.length === 0 && !editingPoi && ( // Show this only if not in "add new" mode from an empty list start
         <p className="text-sm text-muted-foreground text-center py-4">You haven't added any custom POIs yet. Click "Add New" to start.</p>
      )}

      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{editingPoi ? `Edit '${editingPoi.name}'` : 'Add New POI'}</CardTitle>
          <CardDescription>
            {editingPoi ? 'Update the details of your point of interest.' : 'Save a location for quick access. Enter an address and select from suggestions to set coordinates.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            value={autofillInputValue} // Controlled by local state for AddressAutofill interaction
                            onChange={(e) => {
                              setAutofillInputValue(e.target.value);
                              // If user clears the input manually after a selection was made,
                              // RHF's address, lat, and lon should also ideally be cleared
                              // but onRetrieve should handle setting these if a new selection is made
                              // or if user submits with an empty autofillInputValue, RHF validation for address will kick in.
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
                    <FormMessage /> {/* For address field specific errors */}
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
                    {/* Display errors for latitude and longitude from Zod schema */}
                    {form.formState.errors.latitude && <FormMessage>{form.formState.errors.latitude.message}</FormMessage>}
                    {form.formState.errors.longitude && <FormMessage>{form.formState.errors.longitude.message}</FormMessage>}
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input placeholder="Notes about this place" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCancelOrClearForm}>
                  {editingPoi ? 'Cancel Edit' : 'Clear Form'}
                </Button>
                <Button type="submit" disabled={!mapboxAccessToken || form.formState.isSubmitting}>
                  <Icons.Save className="mr-2 h-4 w-4" /> 
                  {editingPoi ? 'Save Changes' : 'Save POI'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
    

    