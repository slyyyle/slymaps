"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openingHoursParser, type ParsedHours } from '@/services/opening-hours-parser';

export default function TestHoursPage() {
  const [inputHours, setInputHours] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedHours | null>(null);

  // Test examples from user
  const testExamples = [
    'Mo-Th 09:00-15:00; Fr 09:00-14:00; Sa,Su off',
    'PH,Mo-Su 19:00-22:00',
    'Hours information not available',
    'Mo-Fr 08:30-17:00',
    'Sa,Su 10:00-16:00',
    '24/7',
    'Mo-We,Fr 09:00-18:00; Th 09:00-20:00; Sa 10:00-14:00; Su off'
  ];

  const testExample = (example: string) => {
    setInputHours(example);
    const result = openingHoursParser.parseOpeningHours(example);
    setParsedResult(result);
  };

  const testCustom = () => {
    if (!inputHours.trim()) return;
    const result = openingHoursParser.parseOpeningHours(inputHours);
    setParsedResult(result);
  };

  const getCurrentStatus = () => {
    if (!parsedResult?.hasData) return null;
    return openingHoursParser.getCurrentDayStatus(parsedResult);
  };

  const currentStatus = getCurrentStatus();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🕐 Opening Hours Parser Test</CardTitle>
          <p className="text-muted-foreground">
            Testing our parser with OSM opening hours format
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test Examples</h3>
            <div className="grid gap-2">
              {testExamples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => testExample(example)}
                  className="justify-start text-left h-auto p-3"
                >
                  <span className="font-mono text-sm">{example}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test Custom</h3>
            <div className="flex gap-2">
              <Input
                value={inputHours}
                onChange={(e) => setInputHours(e.target.value)}
                placeholder="Enter OSM opening hours format..."
                className="font-mono"
              />
              <Button onClick={testCustom}>Parse</Button>
            </div>
          </div>

          {/* Results */}
          {parsedResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📊 Parsed Result</h3>
              
              {/* Current Status */}
              {currentStatus && (
                <div className={`p-3 rounded-lg ${
                  currentStatus.isOpenNow ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      currentStatus.isOpenNow ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {currentStatus.isOpenNow ? '🟢 Open Now' : '🔴 Closed Now'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Today: {currentStatus.todayHours}
                    </span>
                  </div>
                </div>
              )}

              {/* Hours Table */}
              {parsedResult.hasData ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                    Weekly Schedule
                  </div>
                  <div className="divide-y">
                    {parsedResult.schedule.map((dayInfo, index) => {
                      const isToday = new Date().getDay() === (index + 1) % 7;
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center px-3 py-2 ${
                            isToday ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <span className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                            {dayInfo.fullDay}
                            {isToday && <span className="ml-2 text-xs text-primary">(Today)</span>}
                          </span>
                          <span className={`text-sm ${
                            dayInfo.isClosed 
                              ? 'text-red-600 font-medium' 
                              : dayInfo.isOpen 
                                ? 'text-green-600' 
                                : 'text-muted-foreground'
                          }`}>
                            {dayInfo.hours}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No valid hours data found
                </div>
              )}

              {/* Notes */}
              {parsedResult.notes && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                  ℹ️ {parsedResult.notes}
                </div>
              )}

              {/* Raw Data */}
              <details className="border rounded p-3">
                <summary className="cursor-pointer font-medium text-sm">
                  Raw Parser Output
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(parsedResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 