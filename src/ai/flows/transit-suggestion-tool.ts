'use server';

/**
 * @fileOverview AI-powered Transit Suggestion Tool.
 *
 * This tool analyzes user's past routes and proposes more efficient transit options
 * based on the time of day and day of the week.
 *
 * - suggestOptimalRoutesBasedOnPastTrips - A function that handles the transit suggestion process.
 * - SuggestOptimalRoutesBasedOnPastTripsInput - The input type for the suggestOptimalRoutesBasedOnPastTrips function.
 * - SuggestOptimalRoutesBasedOnPastTripsOutput - The return type for the suggestOptimalRoutesBasedOnPastTrips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalRoutesBasedOnPastTripsInputSchema = z.object({
  pastRoutes: z
    .string()
    .describe(
      'A record of the users past routes, including origin, destination, date, and time.'
    ),
  currentTime: z.string().describe('The current time of day.'),
  currentDayOfWeek: z.string().describe('The current day of the week.'),
});
export type SuggestOptimalRoutesBasedOnPastTripsInput = z.infer<
  typeof SuggestOptimalRoutesBasedOnPastTripsInputSchema
>;

const SuggestOptimalRoutesBasedOnPastTripsOutputSchema = z.object({
  suggestedRoutes: z
    .string()
    .describe(
      'A description of the suggested routes, including the reasoning behind the suggestion.'
    ),
});
export type SuggestOptimalRoutesBasedOnPastTripsOutput = z.infer<
  typeof SuggestOptimalRoutesBasedOnPastTripsOutputSchema
>;

export async function suggestOptimalRoutesBasedOnPastTrips(
  input: SuggestOptimalRoutesBasedOnPastTripsInput
): Promise<SuggestOptimalRoutesBasedOnPastTripsOutput> {
  return suggestOptimalRoutesBasedOnPastTripsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalRoutesBasedOnPastTripsPrompt',
  input: {schema: SuggestOptimalRoutesBasedOnPastTripsInputSchema},
  output: {schema: SuggestOptimalRoutesBasedOnPastTripsOutputSchema},
  prompt: `You are an AI transit assistant that analyzes a user's past routes and suggests more efficient routes.

Given the following information about the user's past routes:
{{{pastRoutes}}}

And the current time and day:
Current Time: {{{currentTime}}}
Current Day of Week: {{{currentDayOfWeek}}}

Propose potentially better transit routes, explaining why they might be better. Consider factors such as traffic, bus frequency, and transfer times.`,
});

const suggestOptimalRoutesBasedOnPastTripsFlow = ai.defineFlow(
  {
    name: 'suggestOptimalRoutesBasedOnPastTripsFlow',
    inputSchema: SuggestOptimalRoutesBasedOnPastTripsInputSchema,
    outputSchema: SuggestOptimalRoutesBasedOnPastTripsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
