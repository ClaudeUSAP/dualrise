import { z } from "zod";

export const registerSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^\d{10}$/, "Phone number must contain only digits"),
  profilePhoto: z.any().optional(),

  // Professional Information - University
  universityId: z.string().uuid().optional().nullable(),
  isNewUniversity: z.boolean().optional(),
  newUniversityName: z.string().max(200, "University name must be less than 200 characters").optional(),
  newUniversityDivision: z.enum(['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2']).optional(),
  newUniversityState: z.string().max(100, "State must be less than 100 characters").optional(),
  
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position must be less than 100 characters"),
  experience: z.string().optional(),
  programs: z.object({
    mens: z.boolean(),
    womens: z.boolean(),
  }).refine((data) => data.mens || data.womens, {
    message: "Please select at least one program (Men's or Women's)",
  }),

  // Account Security
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service",
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy",
  }),

  // Verification Information
  recruitingNeeds: z.string().optional(),
  referralSource: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Either existing university selected OR new university with name and division
  if (data.isNewUniversity) {
    return data.newUniversityName && data.newUniversityName.length > 0 && data.newUniversityDivision;
  }
  return data.universityId;
}, {
  message: "Please select a university or add a new one with name and division",
  path: ["universityId"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
