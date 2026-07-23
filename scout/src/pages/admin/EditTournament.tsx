import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getTournamentById, updateTournament } from "@/lib/api/tournaments";
import { Tournament } from "@/types/tournament";
import { formatUSDate, parseUSDate } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { tournamentFormSchema, type TournamentFormValues } from "@/lib/validation/tournamentForm";

const EditTournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    mode: "onTouched",
    defaultValues: {
      seriesName: "",
      year: new Date().getFullYear().toString(),
      location: "",
      country: "",
      sex: "Men",
      tournamentType: "Adult",
      category: "National",
      fieldSize: "",
      coursePar: "",
      courseRating: "",
      yardage: "",
      resultsLink: "",
      startDate: "",
      endDate: "",
      status: "planned",
    },
  });

  useEffect(() => {
    const loadTournament = async () => {
      if (!id) return;
      
      try {
        setIsFetching(true);
        const tournament = await getTournamentById(id);
        
        if (!tournament) {
          toast({
            title: "Error",
            description: "Tournament not found",
            variant: "destructive",
          });
          navigate("/admin/tournaments");
          return;
        }

        form.reset({
          seriesName: tournament.series_name || "",
          year: tournament.year || new Date().getFullYear().toString(),
          location: tournament.location || "",
          country: tournament.country || "",
          sex: tournament.sex || "Men",
          tournamentType: tournament.tournament_type || "Adult",
          category: tournament.category || "National",
          fieldSize: tournament.participatingAthletes?.toString() || "",
          coursePar: tournament.par?.toString() || "",
          courseRating: tournament.courseRating?.toString() || "",
          yardage: tournament.yardage?.toString() || "",
          resultsLink: tournament.resultsLink || "",
          startDate: tournament.startDate ? formatUSDate(tournament.startDate) : "",
          endDate: tournament.endDate ? formatUSDate(tournament.endDate) : "",
          status: tournament.status || "planned",
        });
      } catch (error) {
        console.error("Error loading tournament:", error);
        toast({
          title: "Error",
          description: "Failed to load tournament",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    loadTournament();
  }, [id, navigate, toast, form]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Trigger validation manually
      const isValid = await form.trigger();
      
      if (!isValid) {
        const errors = form.formState.errors;
        const errorMessages = Object.values(errors)
          .map(error => error?.message)
          .filter(Boolean);
        
        if (errorMessages.length > 0) {
          toast({
            title: "Validation Error",
            description: errorMessages[0] as string,
            variant: "destructive",
          });
        }
        return;
      }

      if (!id) return;

      const data = form.getValues();
      
      // Use series name directly as the tournament name
      const tournamentName = `${data.seriesName} ${data.year}`;

      const tournamentData: Partial<Tournament> = {
        name: tournamentName,
        series_name: data.seriesName,
        year: data.year,
        location: data.location,
        country: data.country,
        sex: data.sex,
        tournament_type: data.tournamentType,
        category: data.category,
        participatingAthletes: data.fieldSize ? parseInt(data.fieldSize) : undefined,
        courseRating: data.courseRating ? parseFloat(data.courseRating) : undefined,
        par: data.coursePar ? parseInt(data.coursePar) : undefined,
        yardage: data.yardage ? parseInt(data.yardage) : undefined,
        resultsLink: data.resultsLink || undefined,
        startDate: data.startDate ? parseUSDate(data.startDate) ?? undefined : undefined,
        endDate: data.endDate ? parseUSDate(data.endDate) ?? undefined : undefined,
        status: data.status,
      };

      await updateTournament(id, tournamentData);

      toast({
        title: "Success",
        description: "Tournament updated successfully",
      });

      navigate("/admin/tournaments");
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({
        title: "Error",
        description: "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formValues = form.watch();

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/tournaments">Tournaments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{formValues.seriesName || "Edit Tournament"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Tournament</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., France" {...field} />
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
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coursePar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Par</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 72" {...field} />
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
                      <FormLabel>Course Rating</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 72.0" {...field} />
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
                      <FormLabel>Yardage</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input placeholder="MM/DD/YYYY" {...field} />
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
                        <Input placeholder="MM/DD/YYYY" {...field} />
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
                    <FormLabel>Results Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/tournaments")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Tournament"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditTournament;
