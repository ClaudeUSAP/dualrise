import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { quickTournamentSchema, QuickTournamentFormValues } from "@/lib/validation/quickTournamentForm";

interface QuickTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCreated: (tournament: any) => Promise<boolean>;
  initialName?: string;
}

export default function QuickTournamentDialog({
  open,
  onOpenChange,
  onTournamentCreated,
  initialName = ""
}: QuickTournamentDialogProps) {
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<QuickTournamentFormValues>({
    resolver: zodResolver(quickTournamentSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: initialName,
      year: new Date().getFullYear().toString(),
      sex: "Men",
      location: "",
      country: "",
      startDate: undefined,
      yardage: "",
      par: "72",
      courseRating: "",
      tournamentType: "Adult",
      category: "National",
      resultsLink: "",
    },
  });

  // Update name when dialog opens with initialName
  useEffect(() => {
    if (open && initialName) {
      form.setValue("name", initialName);
    }
  }, [open, initialName, form]);

  const resetForm = () => {
    form.reset({
      name: initialName,
      year: new Date().getFullYear().toString(),
      sex: "Men",
      location: "",
      country: "",
      startDate: undefined,
      yardage: "",
      par: "72",
      courseRating: "",
      tournamentType: "Adult",
      category: "National",
      resultsLink: "",
    });
  };

  const onSubmit = async (data: QuickTournamentFormValues) => {
    setIsCreating(true);

    try {
      // Create tournament object
      const newTournament = {
        name: data.name.trim(),
        series_name: data.name.trim(),
        year: data.year,
        sex: data.sex,
        location: data.location.trim(),
        country: data.country.trim(),
        start_date: data.startDate ? format(data.startDate, "yyyy-MM-dd") : null,
        yardage: data.yardage || null,
        course_par: data.par || null,
        course_slope: '130', // Default value
        course_rating: data.courseRating || null,
        tournament_type: data.tournamentType,
        category: data.category,
        results_link: data.resultsLink?.trim() || null,
        // Generate a temporary ID for immediate use
        _tempId: `temp_${Date.now()}`
      };

      const success = await onTournamentCreated(newTournament);
      
      if (success) {
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const onInvalid = (errors: any) => {
    // Touch all error fields to ensure visual feedback is displayed
    Object.keys(errors).forEach(key => {
      form.trigger(key as keyof QuickTournamentFormValues);
    });
    
    toast({
      title: "Please fix the errors below",
      description: "Some fields require your attention",
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Tournament</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., National Championship"
                          aria-invalid={!!form.formState.errors.name}
                        />
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
                        <Input
                          {...field}
                          placeholder="e.g., 2024"
                          aria-invalid={!!form.formState.errors.year}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!form.formState.errors.sex}>
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
                          <SelectTrigger aria-invalid={!!form.formState.errors.tournamentType}>
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

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!form.formState.errors.category}>
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
              </div>

              {/* Location Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location/Venue *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Pebble Beach Golf Links"
                          aria-invalid={!!form.formState.errors.location}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., USA"
                          aria-invalid={!!form.formState.errors.country}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Results Link */}
              <FormField
                control={form.control}
                name="resultsLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Results Link (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com/results"
                        aria-invalid={!!form.formState.errors.resultsLink}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Course Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Course Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="yardage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yardage</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 7200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="par"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Par (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="72" />
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
                          <Input {...field} placeholder="e.g., 74.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Tournament"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
