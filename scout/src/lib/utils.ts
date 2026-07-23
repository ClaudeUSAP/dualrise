import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate age from date of birth string (YYYY-MM-DD format)
 * Returns null if date is invalid or missing
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  
  try {
    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
}

/**
 * Format a date to US format (MM/DD/YYYY)
 * @param date - Date object, string, null, or undefined
 * @returns Formatted date string or empty string if invalid
 */
export function formatUSDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Parse a US format date string (MM/DD/YYYY) to a Date object
 * @param dateStr - Date string in MM/DD/YYYY format
 * @returns Date object or null if invalid
 */
export function parseUSDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Match MM/DD/YYYY format (with optional leading zeros)
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  
  const month = parseInt(match[1], 10) - 1; // 0-indexed
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date is real (catches things like 02/31/2024)
  if (date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  
  return date;
}
