import { z } from 'zod';

// Contact request form validation schema
export const contactRequestSchema = z.object({
  interestLevel: z.enum(['strong', 'very-strong', 'immediate']),
  whatsappNumber: z.string()
    .trim()
    .min(1, 'WhatsApp number is required')
    // Normalize first: keep a leading "+", drop spaces, dashes, dots, parentheses,
    // etc. so "+1-8722790009" becomes "+18722790009". The cleaned value is what
    // gets validated AND stored.
    .transform((val) => {
      const trimmed = val.trim();
      const digits = trimmed.replace(/[^\d]/g, '');
      return trimmed.startsWith('+') ? `+${digits}` : digits;
    })
    .refine(
      (val) => /^\+?[1-9]\d{1,14}$/.test(val),
      'Please enter a valid phone number with country code (e.g., +1234567890)'
    ),
  preferredContact: z.array(z.enum(['whatsapp', 'email'])).min(1, 'Select at least one contact method'),
  message: z.string()
    .trim()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters')
});

export type ContactRequestFormData = z.infer<typeof contactRequestSchema>;

// Sanitize HTML content to prevent XSS
export const sanitizeInput = (input: string): string => {
  // Remove any HTML tags and scripts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

// Validate and sanitize form data
export const validateContactRequest = (data: unknown) => {
  try {
    const validated = contactRequestSchema.parse(data);
    
    // Additional sanitization for text fields
    return {
      ...validated,
      message: sanitizeInput(validated.message),
      whatsappNumber: validated.whatsappNumber.trim()
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};
