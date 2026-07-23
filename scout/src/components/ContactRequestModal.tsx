import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  Send,
  Heart,
  FileText,
  GraduationCap,
  Target,
  MapPin,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { contactRequestSchema, ContactRequestFormData } from "@/lib/validation/contactRequest";
import { supabase } from "@/integrations/supabase/client";

interface ContactRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    starRating: number;
    gpa: number;
    preferredDivision: string;
    highSchoolYear: string;
    hometown?: string;
    currentSchool?: string;
    scoringAverage?: number;
    bestRecentScoringAvg?: number;
    nationalRanking?: number;
  };
  isFavorited?: boolean;
  hasNotes?: boolean;
  onSubmitSuccess?: () => void;
  showProgress?: { current: number; total: number };
}

export default function ContactRequestModal({
  isOpen,
  onClose,
  athlete,
  isFavorited = false,
  hasNotes = false,
  onSubmitSuccess,
  showProgress
}: ContactRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coachEmail, setCoachEmail] = useState<string | null>(null);

  const form = useForm<ContactRequestFormData>({
    resolver: zodResolver(contactRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      interestLevel: 'strong',
      whatsappNumber: '',
      preferredContact: [],
      message: ''
    }
  });

  const watchPreferredContact = form.watch('preferredContact');

  // Fetch coach email on mount
  useEffect(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCoachEmail(user.email);
    };
    fetchEmail();
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        interestLevel: 'strong',
        whatsappNumber: '',
        preferredContact: [],
        message: ''
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (data: ContactRequestFormData) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      const coachId = user?.id;

      // Insert contact request into database
      const { error } = await supabase
        .from('contact_requests')
        .insert({
          athlete_id: athlete.id,
          coach_id: coachId,
          interest_level: data.interestLevel,
          message: data.message,
          whatsapp_number: data.whatsappNumber,
          preferred_contact: data.preferredContact.join(','),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admin (nicolas@) of the new contact request — fire-and-forget (background)
      if (coachId) {
        supabase.functions.invoke('notify-admin-contact-request', {
          body: {
            coachId,
            athleteId: athlete.id,
            interestLevel: data.interestLevel,
            message: data.message,
          },
        }).then(result => {
          if (result.error) {
            console.error('⚠️ Contact-request admin notification error (background):', result.error);
          }
        }).catch(err => {
          console.error('⚠️ Contact-request admin notification exception (background):', err);
        });
      }

      toast.success("Contact request sent successfully!", {
        description: `Your request for ${athlete.firstName} ${athlete.lastName} has been submitted.`
      });
      
      // Reset form for next athlete
      form.reset({
        interestLevel: 'strong',
        whatsappNumber: '',
        preferredContact: [],
        message: ''
      });
      
      // Call the success callback instead of just closing
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting contact request:', error);
      toast.error("Failed to send contact request", {
        description: error instanceof Error ? error.message : "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: Record<string, { message?: string }>) => {
    const fieldLabels: Record<string, string> = {
      interestLevel: 'Interest level',
      whatsappNumber: 'WhatsApp number',
      preferredContact: 'Contact method',
      message: 'Message',
    };
    const parts = Object.entries(errors).map(([field, err]) => {
      const label = fieldLabels[field] || field;
      return `${label}: ${err?.message || 'is invalid'}`;
    });

    toast.error("Please fix the following before sending", {
      description: parts.length ? parts.join(' · ') : 'Some fields are invalid.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center justify-between">
            <span>Contact Request</span>
            {showProgress && (
              <Badge variant="secondary">
                {showProgress.current} of {showProgress.total}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Request contact with {athlete.firstName} {athlete.lastName} through Dual Rise
            {showProgress && showProgress.total > 1 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                {showProgress.total - showProgress.current} more athlete{showProgress.total - showProgress.current !== 1 ? 's' : ''} after this one
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Athlete Context Header */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={athlete.profileImage} />
                <AvatarFallback>{athlete.firstName[0]}{athlete.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold">
                    {athlete.firstName} {athlete.lastName}
                  </h3>
                  {isFavorited && (
                    <Badge variant="secondary">
                      <Heart className="h-3 w-3 mr-1 fill-current" />
                      Favorited
                    </Badge>
                  )}
                  {hasNotes && (
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      Has Notes
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {athlete.starRating} Star
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    {athlete.gpa} GPA
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {athlete.preferredDivision}
                  </div>
                  {athlete.hometown && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {athlete.hometown}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Interest Level */}
            <FormField
              control={form.control}
              name="interestLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Level *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interest level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="strong">Strong Interest</SelectItem>
                      <SelectItem value="very-strong">Very Strong Interest</SelectItem>
                      <SelectItem value="immediate">Immediate Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* WhatsApp Number */}
            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1234567890"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your WhatsApp number with country code (e.g., +1234567890)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Contact Method */}
            <FormField
              control={form.control}
              name="preferredContact"
              render={() => (
                <FormItem>
                  <FormLabel>How would you like to be introduced to this player? *</FormLabel>
                  <FormDescription>
                    Select how you'd like us to facilitate the introduction.
                  </FormDescription>
                  <div className="space-y-3 mt-2">
                    <FormField
                      control={form.control}
                      name="preferredContact"
                      render={({ field }) => (
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <Checkbox
                              checked={field.value?.includes('whatsapp')}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, 'whatsapp']
                                    : current.filter((v: string) => v !== 'whatsapp')
                                );
                              }}
                            />
                            <span className="text-sm font-medium">WhatsApp</span>
                          </label>
                          <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <Checkbox
                                checked={field.value?.includes('email')}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  field.onChange(
                                    checked
                                      ? [...current, 'email']
                                      : current.filter((v: string) => v !== 'email')
                                  );
                                }}
                              />
                              <span className="text-sm font-medium">Email</span>
                            </label>
                            {field.value?.includes('email') && coachEmail && (
                              <div className="ml-10 mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                Introduction will be sent to {coachEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message / Questions *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your interest in this athlete, ask questions, or discuss next steps..."
                      rows={8}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-end text-xs text-muted-foreground">
                    <span>{field.value.length} / 2000</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
