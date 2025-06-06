"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { suggestOptimalRoutesBasedOnPastTrips, SuggestOptimalRoutesBasedOnPastTripsInput, SuggestOptimalRoutesBasedOnPastTripsOutput } from '@/ai/flows/transit-suggestion-tool';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const formSchema = z.object({
  pastRoutes: z.string().min(10, "Please describe your past routes in more detail."),
  currentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  currentDayOfWeek: z.string().min(1, "Please select a day of the week."),
});

type FormData = z.infer<typeof formSchema>;

export function AiTransitAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestOptimalRoutesBasedOnPastTripsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pastRoutes: "",
      currentTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      currentDayOfWeek: daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() -1], // JS Date Sunday is 0
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const result = await suggestOptimalRoutesBasedOnPastTrips(data as SuggestOptimalRoutesBasedOnPastTripsInput);
      setSuggestion(result);
      toast({
        title: "Suggestion Ready!",
        description: "AI has generated new transit suggestions.",
      });
    } catch (error) {
      console.error("Error fetching transit suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transit suggestions. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-lg flex items-center"><Icons.Suggestion className="w-5 h-5 mr-2 text-accent" />Transit Advisor</CardTitle>
        <CardDescription>Get AI-powered transit suggestions based on your travel patterns.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pastRoutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Past Routes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Mon-Fri, 8 AM: Home (Capitol Hill) to Work (Downtown) via Bus #10. Evening 6 PM: Work to Home via Light Rail.'"
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>Describe your typical past routes, including times and days.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentDayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {daysOfWeek.map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <><Icons.Time className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Icons.Suggestion className="mr-2 h-4 w-4" /> Get Suggestions</>
              )}
            </Button>
            {suggestion && (
              <Card className="bg-secondary/50">
                <CardHeader>
                  <CardTitle className="font-headline text-md">Suggested Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{suggestion.suggestedRoutes}</p>
                </CardContent>
              </Card>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
