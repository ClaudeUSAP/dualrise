import { z } from "zod";

export const athleteFormSchema = z.object({
  // Personal Information (required)
  firstName: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  
  // Personal Information (optional)
  phone: z.string().optional(),
  hometown: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  studentType: z.enum(["firstYear", "transfer"]).optional(),
  status: z.string().optional(),
  
  // Academic Information - all strings for form compatibility
  currentUniversity: z.string().optional(),
  currentSchool: z.string().optional(),
  major: z.string().optional(),
  gpa: z.string().optional(),
  graduationYear: z.string().optional(),
  satScore: z.string().optional(),
  toeflScore: z.string().optional(),
  academicRating: z.string().optional(),
  
  // Athletic Information - all strings for form compatibility
  handicap: z.string().optional(),
  averageScore: z.string().optional(),
  nationalRanking: z.string().optional(),
  regionalRanking: z.string().optional(),
  tournamentWins: z.string().optional(),
  topFinishes: z.string().optional(),
  athleticRating: z.string().optional(),
  overallRating: z.string().optional(),
  starRating: z.string().optional(),
  instagramHandle: z.string().optional(),
  swingCoach: z.string().optional(),
  
  // Preferences - all strings for form compatibility
  ncaaDivision: z.string().optional(),
  budget: z.string().optional(),
  preferredStates: z.array(z.string()).optional(),
  preferredMajors: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type AthleteFormValues = z.infer<typeof athleteFormSchema>;
