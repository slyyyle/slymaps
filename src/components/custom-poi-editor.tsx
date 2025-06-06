
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AddressAutofill, config as mapboxSearchConfig } from '@mapbox/search-js-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { CustomPOI, Coordinates } from '@/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CAPITOL_HILL_COORDS } from '@/lib/constants';

const poiSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required (e.g., Home, Work, Favorite Cafe)"),
  address: z.string().min(1, "Address is required. Select a valid address to get coordinates."),
  latitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val);
      if (typeof val === 'number') return val;
      return undefined; // Return undefined if not convertible, Zod will catch if required
    },
    z.number({ 
      invalid_type_error: "Latitude must be a valid number.", 
      required_error: "Coordinates couldn't be determined. Please select a valid address." 
    }).min(-90, "Invalid latitude").max(90, "Invalid latitude")
  ),
  longitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val);
      if (typeof val === 'number') return val;
      return undefined; // Return undefined if not convertible, Zod will catch if required
    },
    z.number({ 
      invalid_type_error: "Longitude must be a valid number.", 
      required_error: "Coordinates couldn't be determined. Please select a valid address." 
    }).min(-180, "Invalid longitude").max(180, "Invalid longitude")
  ),
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
  const [addressInputValue, setAddressInputValue] = useState('');
  const [tokenInitializing, setTokenInitializing] = useState(true);
  const { toast } = useToast();

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
          latitude: editingPoi.latitude, // Should be a number
          longitude: editingPoi.longitude, // Should be a number
          description: editingPoi.description || '',
        });
        setAddressInputValue(editingPoi.address || '');
      } else {
        form.reset({ name: '', type: '', address: '', latitude: undefined, longitude: undefined, description: '' });
        setAddressInputValue('');
      }
    }
  }, [editingPoi, form, isDialogOpen]);

  const handleAddressRetrieve = (response: any) => {
    const feature = response.features[0];
    if (feature && feature.geometry && feature.geometry.coordinates) {
      const lat = parseFloat(feature.geometry.coordinates[1]);
      const lon = parseFloat(feature.geometry.coordinates[0]);

      form.setValue('address', feature.properties.formatted_address || feature.properties.name || '', { shouldValidate: true });
      setAddressInputValue(feature.properties.formatted_address || feature.properties.name || '');
      
      form.setValue('latitude', lat, { shouldValidate: true });
      form.setValue('longitude', lon, { shouldValidate: true });
      
      form.clearErrors(['latitude', 'longitude', 'address']);
    } else {
      form.setValue('latitude', undefined, { shouldValidate: true });
      form.setValue('longitude', undefined, { shouldValidate: true });
      form.setError("address", {type: "manual", message: "Could not find coordinates for this address. Please try a different one."})
    }
  };

  const onSubmit: SubmitHandler<PoiFormData> = (data) => {
    // data.latitude and data.longitude should be numbers here thanks to Zod's preprocess and resolver
    if (data.latitude === undefined || data.longitude === undefined || isNaN(data.latitude) || isNaN(data.longitude)) {
      form.setError("address", { type: "manual", message: "Please select a valid address from suggestions to set coordinates." });
      return;
    }

    const poiData: CustomPOI = {
      id: editingPoi ? editingPoi.id : `custom-${Date.now()}`,
      name: data.name,
      type: data.type,
      address: data.address,
      latitude: data.latitude, // This must be a number
      longitude: data.longitude, // This must be a number
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
      name: '',
      type: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      description: ''
    });
    setAddressInputValue('');
    setIsDialogOpen(true);
  };
  
  const handleAddressInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setAddressInputValue(value);
    form.setValue('address', value, {shouldValidate: true});
    if (value === '') {
      form.setValue('latitude', undefined, { shouldValidate: true });
      form.setValue('longitude', undefined, { shouldValidate: true });
    }
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
            <CardTitle className="text-md">Your Custom POIs</CardTitle>
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
            <DialogDescription>
              {editingPoi ? 'Update the details of your point of interest.' : 'Save a location for quick access. Enter an address and select from suggestions to set coordinates.'}
            </DialogDescription>
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
                            placeholder="Type an address and select from suggestions"
                            value={addressInputValue} 
                            onChange={handleAddressInputChange}
                            autoComplete="off"
                          />
                        </AddressAutofill>
                       )}
                    </FormControl>
                    <FormDescription>
                      Coordinates (Lat/Lon) will be automatically set when you select an address.
                      {(watchedLat !== undefined && watchedLng !== undefined && !isNaN(watchedLat) && !isNaN(watchedLng)) ? (
                        <span className="block text-xs mt-1">
                          Selected: Lat: {Number(watchedLat).toFixed(5)}, Lon: {Number(watchedLng).toFixed(5)}
                        </span>
                      ) : null}
                    </FormDescription>
                    <FormMessage /> {/* For 'address' field specific errors */}
                  </FormItem>
                )}
              />
              {/* Hidden latitude and longitude fields. valueAsNumber helps RHF. */}
              <input type="hidden" {...form.register("latitude", { valueAsNumber: true })} />
              <input type="hidden" {...form.register("longitude", { valueAsNumber: true })} />
              
              {/* Display errors specifically for latitude/longitude if they are not caught by 'address' validation */}
              {form.formState.errors.latitude && <FormMessage>{form.formState.errors.latitude.message}</FormMessage>}
              {form.formState.errors.longitude && <FormMessage>{form.formState.errors.longitude.message}</FormMessage>}

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
