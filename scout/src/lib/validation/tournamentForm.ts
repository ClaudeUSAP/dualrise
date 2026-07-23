import { z } from "zod";

export const tournamentFormSchema = z.object({
  seriesName: z
    .string()
    .min(1, "Series name is required")
    .max(200, "Series name must be less than 200 characters"),
  year: z
    .string()
    .min(4, "Year is required")
    .max(4, "Year must be 4 digits")
    .regex(/^\d{4}$/, "Year must be a valid 4-digit year"),
  sex: z.enum(["Men", "Women"]),
  tournamentType: z.enum(["Adult", "Junior"]),
  category: z.enum(["National", "International", "National Team", "Club Competition", "PRO", "Collegiate"]),
  location: z
    .string()
    .max(200, "Location must be less than 200 characters")
    .optional(),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters"),
  fieldSize: z
    .string()
    .regex(/^\d+$/, "Field size must be a number")
    .optional()
    .or(z.literal("")),
  coursePar: z
    .string()
    .regex(/^\d+\.?\d*$/, "Course par must be a valid number")
    .optional()
    .or(z.literal("")),
  courseRating: z
    .string()
    .regex(/^\d+\.?\d*$/, "Course rating must be a valid number")
    .optional()
    .or(z.literal("")),
  yardage: z
    .string()
    .regex(/^\d+$/, "Yardage must be a number")
    .optional()
    .or(z.literal("")),
  resultsLink: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
      "Must be a valid URL (starting with http:// or https://)"
    ),
  startDate: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/, "Date must be in MM/DD/YYYY format")
    .optional()
    .or(z.literal("")),
  endDate: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/, "Date must be in MM/DD/YYYY format")
    .optional()
    .or(z.literal("")),
  status: z.enum(["planned", "in_progress", "completed", "cancelled", "archived"]),
});

export type TournamentFormValues = z.infer<typeof tournamentFormSchema>;
