import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { createTournament } from '@/lib/api/tournaments';
import { tournamentFormSchema, type TournamentFormValues } from '@/lib/validation/tournamentForm';
import { parseUSDate } from '@/lib/utils';

export default function AddNewTournament() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      seriesName: '',
      year: new Date().getFullYear().toString(),
      sex: 'Men',
      tournamentType: 'Adult',
      category: 'National',
      location: '',
      country: '',
      coursePar: '',
      courseRating: '',
      fieldSize: '',
      startDate: "",
      endDate: "",
      status: 'planned',
      yardage: '',
      resultsLink: '',
    },
  });

  const watchedFields = form.watch();

  const onSubmit = async (data: TournamentFormValues) => {
    setIsLoading(true);
    
    try {
      // Use series name directly as the tournament name
      const tournamentName = `${data.seriesName} ${data.year}`;

      await createTournament({
        name: tournamentName,
        series_name: data.seriesName,
        year: data.year,
        sex: data.sex,
        tournament_type: data.tournamentType,
        category: data.category,
        location: data.location,
        country: data.country,
        par: data.coursePar ? parseInt(data.coursePar) : undefined,
        courseRating: data.courseRating ? parseFloat(data.courseRating) : undefined,
        participatingAthletes: data.fieldSize ? parseInt(data.fieldSize) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: data.startDate ? parseUSDate(data.startDate) ?? undefined : undefined,
        endDate: data.endDate ? parseUSDate(data.endDate) ?? undefined : undefined,
        status: data.status,
        yardage: data.yardage ? parseInt(data.yardage) : undefined,
        resultsLink: data.resultsLink || undefined,
      });
      
      toast({
        title: 'Tournament Created',
        description: `${tournamentName} has been successfully created.`,
      });
      navigate('/admin/tournaments');
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tournament',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    // Touch all error fields to ensure visual feedback is displayed
    Object.keys(errors).forEach(key => {
      form.trigger(key as keyof TournamentFormValues);
    });
    
    toast({
      title: "Please fix the errors below",
      description: "Some fields require your attention",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/tournaments')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add New Tournament</h1>
              <p className="text-sm text-muted-foreground">Create a new tournament</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Basic information about the tournament</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="seriesName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Series Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., French National Championship" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Men">Men</SelectItem>
                            <SelectItem value="Women">Women</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tournamentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Adult">Adult</SelectItem>
                            <SelectItem value="Junior">Junior</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="National">National</SelectItem>
                            <SelectItem value="International">International</SelectItem>
                            <SelectItem value="National Team">National Team</SelectItem>
                            <SelectItem value="Club Competition">Club Competition</SelectItem>
                            <SelectItem value="PRO">PRO</SelectItem>
                            <SelectItem value="Collegiate">Collegiate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Paris (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fieldSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Size</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 96" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                  <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="coursePar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Par (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 72" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Rating (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g., 72.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="yardage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yardage (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 6800" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="MM/DD/YYYY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="MM/DD/YYYY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="resultsLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Results Link (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/results" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/tournaments')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Tournament'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
