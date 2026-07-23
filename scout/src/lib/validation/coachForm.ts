import { z } from 'zod';

// Coach form validation schema
export const coachFormSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    // Allow any Unicode letter (accents like é/ñ/ü, etc.), spaces, apostrophes, hyphens, dots
    .regex(/^[\p{L}\s'.-]+$/u, 'First name contains invalid characters'),
  lastName: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[\p{L}\s'.-]+$/u, 'Last name contains invalid characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .trim()
    // Lenient international phone: digits, spaces, +, -, (), dots; min 6 digits
    .regex(/^\+?[\d\s().-]{6,}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  university: z.string()
    .trim()
    .min(1, 'University is required')
    .max(200, 'University name must be less than 200 characters'),
  division: z.string()
    .trim()
    .min(1, 'Division is required'),
  position: z.string()
    .trim()
    .max(100, 'Position must be less than 100 characters')
    .optional(),
  yearsExperience: z.string()
    .trim()
    .regex(/^\d{1,2}$/, 'Years of experience must be a valid number')
    .optional()
    .or(z.literal('')),
  specialties: z.array(z.string()).default([]),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
  confirmPassword: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  sendCredentials: z.boolean(),
  sendWelcome: z.boolean(),
  notes: z.string()
    .trim()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  tags: z.string()
    .trim()
    .max(200, 'Tags must be less than 200 characters')
    .optional(),
  priority: z.enum(['low', 'medium', 'high'])
}).refine((data) => {
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type CoachFormData = z.infer<typeof coachFormSchema>;

// Secure storage utilities
export const secureFormStorage = {
  // Use sessionStorage instead of localStorage for sensitive data
  // SessionStorage is cleared when the browser tab is closed
  saveFormDraft: (formData: Partial<CoachFormData>) => {
    // Remove sensitive fields before storing
    const { password, confirmPassword, ...safeData } = formData;
    sessionStorage.setItem('coachFormDraft', JSON.stringify(safeData));
  },
  
  loadFormDraft: (): Partial<CoachFormData> | null => {
    const draft = sessionStorage.getItem('coachFormDraft');
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch {
        return null;
      }
    }
    return null;
  },
  
  clearFormDraft: () => {
    sessionStorage.removeItem('coachFormDraft');
  }
};