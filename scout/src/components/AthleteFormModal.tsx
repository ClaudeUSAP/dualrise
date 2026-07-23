import { useState, useEffect } from 'react';
import { ATHLETE_STATUSES, statusLabel } from '@/lib/athleteStatus';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Athlete } from '@/types/athlete';
import { toast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { athleteFormSchema, AthleteFormValues } from '@/lib/validation/athleteFormModal';

interface AthleteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete?: Athlete | null;
  onSave: (athlete: Partial<Athlete>) => void;
}

const AthleteFormModal = ({ isOpen, onClose, athlete, onSave }: AthleteFormModalProps) => {
  const [studentType, setStudentType] = useState<'firstYear' | 'transfer'>('firstYear');

  const form = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteFormSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      hometown: '',
      height: '',
      weight: '',
      studentType: 'firstYear',
      status: 'available',
      currentUniversity: '',
      major: '',
      gpa: '',
      graduationYear: new Date().getFullYear().toString(),
      satScore: '',
      toeflScore: '',
      academicRating: '',
      handicap: '',
      averageScore: '',
      nationalRanking: '',
      regionalRanking: '',
      tournamentWins: '',
      topFinishes: '',
      athleticRating: '',
      overallRating: '',
      starRating: '',
      instagramHandle: '',
      swingCoach: '',
      ncaaDivision: 'I',
      budget: '',
      preferredStates: [],
      preferredMajors: [],
      notes: '',
      currentSchool: '',
    },
  });

  useEffect(() => {
    if (athlete) {
      form.reset({
        firstName: athlete.firstName || '',
        lastName: athlete.lastName || '',
        email: athlete.email || '',
        phone: athlete.phone || '',
        hometown: athlete.hometown || '',
        height: athlete.height || '',
        weight: athlete.weight || '',
        studentType: athlete.studentType === 'transfer' ? 'transfer' : 'firstYear',
        status: athlete.status || 'available',
        currentUniversity: athlete.currentUniversity || '',
        major: athlete.major || '',
        gpa: athlete.gpa?.toString() || '',
        graduationYear: athlete.graduationYear?.toString() || new Date().getFullYear().toString(),
        satScore: athlete.satScore?.toString() || '',
        toeflScore: athlete.toeflScore?.toString() || '',
        academicRating: athlete.academicRating?.toString() || '',
        handicap: athlete.handicap?.toString() || '',
        averageScore: athlete.averageScore?.toString() || '',
        nationalRanking: athlete.nationalRanking?.toString() || '',
        regionalRanking: athlete.regionalRanking?.toString() || '',
        tournamentWins: athlete.tournamentWins?.toString() || '',
        topFinishes: athlete.topFinishes?.toString() || '',
        athleticRating: athlete.athleticRating?.toString() || '',
        overallRating: athlete.overallRating?.toString() || '',
        starRating: athlete.starRating?.toString() || '3',
        instagramHandle: athlete.instagramHandle || '',
        swingCoach: athlete.swingCoach || '',
        ncaaDivision: athlete.ncaaDivision || 'I',
        budget: athlete.budget?.toString() || '',
        preferredStates: athlete.preferredStates || [],
        preferredMajors: athlete.preferredMajors || [],
        notes: '',
        currentSchool: athlete.currentSchool || '',
      });
      setStudentType(athlete.studentType === 'transfer' ? 'transfer' : 'firstYear');
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        hometown: '',
        height: '',
        weight: '',
        studentType: 'firstYear',
        status: 'available',
        currentUniversity: '',
        major: '',
        gpa: '',
        graduationYear: new Date().getFullYear().toString(),
        satScore: '',
        toeflScore: '',
        academicRating: '',
        handicap: '',
        averageScore: '',
        nationalRanking: '',
        regionalRanking: '',
        tournamentWins: '',
        topFinishes: '',
        athleticRating: '',
        overallRating: '',
        starRating: '3',
        instagramHandle: '',
        swingCoach: '',
        ncaaDivision: 'I',
        budget: '',
        preferredStates: [],
        preferredMajors: [],
        notes: '',
        currentSchool: '',
      });
      setStudentType('firstYear');
    }
  }, [athlete, form]);

  const onSubmit = (data: AthleteFormValues) => {
    // Convert numeric strings back to numbers for the athlete object
    const dataToSave: Partial<Athlete> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      hometown: data.hometown || undefined,
      height: data.height || undefined,
      weight: data.weight || undefined,
      studentType: (studentType === 'transfer' ? 'transfer' : 'first_year') as 'first_year' | 'transfer',
      status: (data.status as 'available' | 'committed' | 'new' | 'transfer' | 'archived') || 'available',
      currentUniversity: studentType === 'transfer' ? data.currentUniversity : undefined,
      currentSchool: studentType === 'transfer' ? data.currentSchool : undefined,
      major: data.major || undefined,
      gpa: data.gpa ? parseFloat(data.gpa) : undefined,
      graduationYear: data.graduationYear || undefined,
      satScore: data.satScore ? parseInt(data.satScore) : undefined,
      toeflScore: data.toeflScore ? parseInt(data.toeflScore) : undefined,
      academicRating: data.academicRating ? parseFloat(data.academicRating) : undefined,
      handicap: data.handicap ? parseFloat(data.handicap) : undefined,
      averageScore: data.averageScore ? parseFloat(data.averageScore) : undefined,
      nationalRanking: data.nationalRanking ? parseInt(data.nationalRanking) : undefined,
      regionalRanking: data.regionalRanking ? parseInt(data.regionalRanking) : undefined,
      tournamentWins: data.tournamentWins ? parseInt(data.tournamentWins) : undefined,
      topFinishes: data.topFinishes ? parseInt(data.topFinishes) : undefined,
      athleticRating: data.athleticRating ? parseFloat(data.athleticRating) : undefined,
      overallRating: data.overallRating ? parseFloat(data.overallRating) : undefined,
      starRating: data.starRating ? parseFloat(data.starRating) : 3,
      instagramHandle: data.instagramHandle || undefined,
      swingCoach: data.swingCoach || undefined,
      ncaaDivision: (data.ncaaDivision as 'I' | 'II' | 'III' | 'NAIA' | 'NJCAA 1' | 'NJCAA 2') || 'I',
      budget: data.budget ? parseInt(data.budget) : undefined,
      preferredStates: data.preferredStates || [],
      preferredMajors: data.preferredMajors || [],
    };
    
    onSave(dataToSave);
    onClose();
  };

  const onInvalid = () => {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{athlete ? 'Edit Athlete' : 'Add New Athlete'}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {athlete ? 'Update athlete profile information' : 'Create a new athlete profile'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="athletic">Athletic</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" aria-invalid={!!form.formState.errors.firstName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" aria-invalid={!!form.formState.errors.lastName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" aria-invalid={!!form.formState.errors.email} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  {/* Student Type Selection */}
                  <div className="space-y-2">
                    <FormLabel>Student Type</FormLabel>
                    <Select value={studentType} onValueChange={(value: 'firstYear' | 'transfer') => setStudentType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firstYear">First Year</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hometown"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hometown</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="New York, NY" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {studentType === 'firstYear' && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ATHLETE_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {statusLabel(s)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="180" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="75" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="academic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currentUniversity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current University</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Stanford University" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="major"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Major</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Business Administration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPA</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.1" placeholder="3.8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Graduation Year</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="2024" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="satScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SAT Score</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="1400" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toeflScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TOEFL Score</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="academicRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Rating (0-6)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="6" step="0.5" placeholder="4.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="athletic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="handicap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handicap</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.1" placeholder="2.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="averageScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Score</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="72" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nationalRanking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Ranking</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="regionalRanking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regional Ranking</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tournamentWins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Wins</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="topFinishes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Top 10 Finishes</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="15" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="athleticRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Athletic Rating (0-7)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="7" step="0.5" placeholder="5.0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="overallRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Rating (0-7)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="7" step="0.5" placeholder="4.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="starRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Star Rating (0-7)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" max="7" step="0.5" placeholder="3" />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Overall rating: 0 (lowest) to 7 (highest). Displayed as stars on athlete cards.
                      </p>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="instagramHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram Handle</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="swingCoach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Swing Coach</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Coach name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ncaaDivision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred NCAA Division</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I">Division I</SelectItem>
                            <SelectItem value="II">Division II</SelectItem>
                            <SelectItem value="III">Division III</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (USD)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="50000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Additional notes about the athlete..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {athlete ? 'Update Athlete' : 'Add Athlete'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AthleteFormModal;
