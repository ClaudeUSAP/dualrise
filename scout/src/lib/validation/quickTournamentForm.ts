import { z } from "zod";

export const quickTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required").max(200, "Name must be less than 200 characters"),
  year: z
    .string()
    .min(1, "Year is required")
    .refine(
      (val) => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 1900 && num <= 2100;
      },
      "Please enter a valid year (1900-2100)"
    ),
  sex: z.string().min(1, "Gender is required"),
  location: z.string().min(1, "Location is required").max(200, "Location must be less than 200 characters"),
  country: z.string().min(1, "Country is required").max(100, "Country must be less than 100 characters"),
  startDate: z.date().optional().nullable(),
  yardage: z.string().optional(),
  par: z.string().optional(),
  courseRating: z.string().optional(),
  tournamentType: z.string().min(1, "Type is required"),
  category: z.string().min(1, "Category is required"),
  resultsLink: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
      "Must be a valid URL (starting with http:// or https://)"
    ),
});

export type QuickTournamentFormValues = z.infer<typeof quickTournamentSchema>;
