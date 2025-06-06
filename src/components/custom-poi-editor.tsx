"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { CustomPOI } from '@/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from './ui/scroll-area';

const poiSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required (e.g., Home, Work, Favorite Cafe)"),
  address: z.string().optional(), // For display, actual geocoding would be complex here
  latitude: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(-90).max(90)
  ),
  longitude: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(-180).max(180)
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
}

export function CustomPoiEditor({ customPois, onAdd, onUpdate, onDelete, onSelectPoi }: CustomPoiEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<CustomPOI | null>(null);

  const form = useForm<PoiFormData>({
    resolver: zodResolver(poiSchema),
  });

  React.useEffect(() => {
    if (editingPoi) {
      form.reset({
        name: editingPoi.name,
        type: editingPoi.type,
        address: editingPoi.address || '',
        latitude: editingPoi.latitude,
        longitude: editingPoi.longitude,
        description: editingPoi.description || '',
      });
    } else {
      form.reset({ name: '', type: '', address: '', latitude: undefined, longitude: undefined, description: '' });
    }
  }, [editingPoi, form, isDialogOpen]);

  const onSubmit: SubmitHandler<PoiFormData> = (data) => {
    const poiData = {
      ...data,
      id: editingPoi ? editingPoi.id : `custom-${Date.now()}`,
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
    setIsDialogOpen(true);
  };

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


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingPoi ? 'Edit' : 'Add'} Custom POI</DialogTitle>
            <DialogDescription>
              {editingPoi ? 'Update the details of your point of interest.' : 'Save a location for quick access on the map.'}
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
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input placeholder="123 Main St, Seattle" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" placeholder="47.6062" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" placeholder="-122.3321" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input placeholder="Notes about this place" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit"><Icons.Save className="mr-2 h-4 w-4" /> Save POI</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
