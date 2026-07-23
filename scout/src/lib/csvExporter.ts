import { supabase } from "@/integrations/supabase/client";
import type { Athlete } from "@/types/athlete";
import type { Tournament, TournamentResult } from "@/types/tournament";
import JSZip from 'jszip';

// Helper function to escape CSV values
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Convert array of objects to CSV string
const convertToCSV = (headers: string[], rows: any[][]): string => {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
};

// Trigger download of CSV file
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export athletes to CSV
export const exportAthletes = async (selectedColumns?: string[]): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) throw error;
    if (!athletes || athletes.length === 0) {
      return { success: false, count: 0, error: 'No athletes found to export' };
    }

    // Define all possible columns
    const allColumns = {
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Date of Birth': 'date_of_birth',
      'Sex': 'sex',
      'Country': 'country',
      'Graduation Year': 'graduation_year',
      'Student Type': 'student_type',
      'Status': 'status',
      'Committed': 'committed',
      'Committed To': 'committed_to',
      'Academic GPA': 'academic_gpa',
      'SAT': 'sat',
      'TOEFL': 'toefl',
      'Duolingo': 'duolingo',
      'Intended Majors': 'intended_majors',
      'Golf Club/Team': 'golf_club_team',
      'Scoring Average': 'scoring_average',
      'Scoring Avg vs Par': 'scoring_average_vs_par',
      'Scoring Avg vs CR': 'scoring_average_vs_course_rating',
      'Scoring Avg vs CR (Current Year)': 'scoring_avg_vs_cr_current_year',
      'Scoring Avg vs CR (Last 5)': 'scoring_avg_vs_cr_last_5',
      'Scoring Avg vs CR (Last 10)': 'scoring_avg_vs_cr_last_10',
      'French Adult Ranking': 'french_adult_ranking',
      'French Class Ranking': 'french_ranking_in_their_class',
      'WAGR Ranking': 'wagr_ranking',
      'Drive Distance (Carry)': 'drive_distance_carry',
      '7-Iron Distance (Carry)': 'seven_iron_distance_carry',
      'Max Club Head Speed': 'max_club_head_speed',
      'Strengths': 'strengths',
      'Areas of Improvement': 'areas_of_improvement',
      'Budget Preference': 'preferences_budget',
      'Division Preference': 'preferences_division',
      'Region Preference': 'preferences_region',
      'Large City Importance': 'importance_large_city',
      'Video Links': 'video_links',
      'Other Interests': 'other_interests',
      'Why Good Recruit': 'why_good_recruit',
      'Something Else Coaches Should Know': 'something_else_coaches_know',
      'Instagram Handle': 'instagram_handle',
      'Profile Photo': 'profile_photo',
    };

    // Use selected columns or all columns
    const columnsToExport = selectedColumns && selectedColumns.length > 0
      ? Object.entries(allColumns).filter(([label]) => selectedColumns.includes(label))
      : Object.entries(allColumns);

    const headers = columnsToExport.map(([label]) => label);
    const rows = athletes.map(athlete => 
      columnsToExport.map(([, field]) => athlete[field])
    );

    const csvContent = convertToCSV(headers, rows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `athletes_export_${timestamp}.csv`);

    return { success: true, count: athletes.length };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Export tournaments to CSV
export const exportTournaments = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('year', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    if (!tournaments || tournaments.length === 0) {
      return { success: false, count: 0, error: 'No tournaments found to export' };
    }

    const headers = [
      'Name',
      'Year',
      'Location',
      'Country',
      'Sex',
      'Start Date',
      'End Date',
      'Tournament Type',
      'Category (France)',
      'Course Par',
      'Course Rating',
      'Yardage',
      'Field Size',
      'Status',
      'Results Link',
    ];

    const rows = tournaments.map(t => [
      t.name,
      t.year,
      t.location,
      t.country,
      t.sex,
      t.start_date,
      t.end_date,
      t.tournament_type,
      t.category,
      t.course_par,
      t.course_rating,
      t.yardage,
      t.field_size,
      t.status,
      t.results_link,
    ]);

    const csvContent = convertToCSV(headers, rows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `tournaments_export_${timestamp}.csv`);

    return { success: true, count: tournaments.length };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Export tournament results to CSV
export const exportTournamentResults = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data: results, error } = await supabase
      .from('tournament_results')
      .select(`
        *,
        tournament:tournaments(*),
        athlete:athletes(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!results || results.length === 0) {
      return { success: false, count: 0, error: 'No tournament results found to export' };
    }

    const headers = [
      'Tournament Name',
      'Year',
      'Location',
      'Athlete First Name',
      'Athlete Last Name',
      'Position',
      'Position Text',
      'Total Score',
      'Rounds',
      'Field Size',
      'Notes',
    ];

    const rows = results.map(r => [
      r.tournament?.name || '',
      r.tournament?.year || '',
      r.tournament?.location || '',
      r.athlete?.first_name || '',
      r.athlete?.last_name || '',
      r.position,
      r.position_text,
      r.total_score,
      r.rounds,
      r.tournament?.field_size || '',  // Use tournament-level field_size (source of truth)
      r.notes,
    ]);

    const csvContent = convertToCSV(headers, rows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `tournament_results_export_${timestamp}.csv`);

    return { success: true, count: results.length };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Helper function to validate URL
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

// Export tournaments with missing/invalid result links for bulk update
export const exportTournamentsForResultsLinkUpdate = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('year', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    if (!tournaments || tournaments.length === 0) {
      return { success: false, count: 0, error: 'No tournaments found' };
    }

    // Filter to only tournaments with missing or invalid URLs
    const tournamentsWithInvalidLinks = tournaments.filter(t => 
      !t.results_link || !isValidUrl(t.results_link)
    );

    if (tournamentsWithInvalidLinks.length === 0) {
      return { success: false, count: 0, error: 'All tournaments already have valid result links' };
    }

    const headers = [
      'Name',
      'Year',
      'Sex',
      'Tournament Type',
      'Category (France)',
      'Current Results Link',
      'Results Link',
    ];

    const rows = tournamentsWithInvalidLinks.map(t => [
      t.name,
      t.year,
      t.sex,
      t.tournament_type,
      t.category,
      t.results_link || '', // Show current invalid value for reference
      '', // Empty column for user to fill in with valid URL
    ]);

    const csvContent = convertToCSV(headers, rows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `tournaments_missing_links_${timestamp}.csv`);

    return { success: true, count: tournamentsWithInvalidLinks.length };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Export user GDPR data as ZIP file
export const exportUserGDPRData = async (userId: string): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const zip = new JSZip();
    let totalCategories = 0;

    // 1. Fetch User Profile with role from user_roles
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User not found');

    const userRole = (userData as any).user_roles?.[0]?.role || 'coach';
    const userHeaders = ['Email', 'Full Name', 'First Name', 'Last Name', 'Role', 'School Name', 'Position', 'Phone', 'WhatsApp', 'Status', 'Recruiting Needs', 'Brochure URL', 'Created At', 'Updated At'];
    const userRows = [[
      userData.email,
      userData.full_name,
      userData.first_name,
      userData.last_name,
      userRole,
      userData.school_name,
      userData.position,
      userData.phone,
      userData.whatsapp_number,
      userData.status,
      userData.recruiting_needs,
      userData.brochure_url,
      userData.created_at,
      userData.updated_at,
    ]];
    zip.file('user_profile.csv', convertToCSV(userHeaders, userRows));
    totalCategories++;

    // 2. Fetch Saved Searches
    const { data: searches } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('coach_id', userId)
      .order('created_at', { ascending: false });

    if (searches && searches.length > 0) {
      const searchHeaders = ['Name', 'Description', 'Search Criteria', 'Match Count', 'New Matches', 'Alert Enabled', 'Alert Frequency', 'Created At', 'Updated At', 'Last Run'];
      const searchRows = searches.map(s => [
        s.name,
        s.description,
        JSON.stringify(s.search_criteria),
        s.match_count,
        s.new_matches_count,
        s.is_alert_enabled,
        s.alert_frequency,
        s.created_at,
        s.updated_at,
        s.last_run,
      ]);
      zip.file('saved_searches.csv', convertToCSV(searchHeaders, searchRows));
      totalCategories++;
    }

    // 3. Fetch Favorites
    const { data: favorites } = await supabase
      .from('favorites')
      .select(`
        *,
        athlete:athletes(first_name, last_name, country, graduation_year)
      `)
      .eq('coach_id', userId)
      .order('created_at', { ascending: false });

    if (favorites && favorites.length > 0) {
      const favHeaders = ['Athlete First Name', 'Athlete Last Name', 'Athlete Country', 'Athlete Graduation Year', 'Status', 'Notes', 'Created At'];
      const favRows = favorites.map(f => [
        f.athlete?.first_name || '',
        f.athlete?.last_name || '',
        f.athlete?.country || '',
        f.athlete?.graduation_year || '',
        f.status,
        f.notes,
        f.created_at,
      ]);
      zip.file('favorites.csv', convertToCSV(favHeaders, favRows));
      totalCategories++;
    }

    // 4. Fetch Contact Requests
    const { data: contacts } = await supabase
      .from('contact_requests')
      .select(`
        *,
        athlete:athletes(first_name, last_name, country)
      `)
      .eq('coach_id', userId)
      .order('created_at', { ascending: false });

    if (contacts && contacts.length > 0) {
      const contactHeaders = ['Athlete First Name', 'Athlete Last Name', 'Athlete Country', 'Message', 'Interest Level', 'Preferred Contact', 'WhatsApp Number', 'Status', 'Admin Notes', 'Created At', 'Responded At'];
      const contactRows = contacts.map(c => [
        c.athlete?.first_name || '',
        c.athlete?.last_name || '',
        c.athlete?.country || '',
        c.message,
        c.interest_level,
        c.preferred_contact,
        c.whatsapp_number,
        c.status,
        c.admin_notes,
        c.created_at,
        c.responded_at,
      ]);
      zip.file('contact_requests.csv', convertToCSV(contactHeaders, contactRows));
      totalCategories++;
    }

    // 5. Fetch Notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (notifications && notifications.length > 0) {
      const notifHeaders = ['Title', 'Message', 'Category', 'Type', 'Description', 'Is Read', 'Is Priority', 'Action URL', 'Created At'];
      const notifRows = notifications.map(n => [
        n.title,
        n.message,
        n.category,
        n.notification_type,
        n.description,
        n.is_read,
        n.is_priority,
        n.action_url,
        n.created_at,
      ]);
      zip.file('notifications.csv', convertToCSV(notifHeaders, notifRows));
      totalCategories++;
    }

    // 6. Fetch Athlete Notes
    const { data: notes } = await supabase
      .from('athlete_notes')
      .select(`
        *,
        athlete:athletes(first_name, last_name)
      `)
      .eq('coach_id', userId)
      .order('created_at', { ascending: false });

    if (notes && notes.length > 0) {
      const noteHeaders = ['Athlete First Name', 'Athlete Last Name', 'Note Text', 'Category', 'Created At', 'Updated At'];
      const noteRows = notes.map(n => [
        n.athlete?.first_name || '',
        n.athlete?.last_name || '',
        n.note_text,
        n.category,
        n.created_at,
        n.updated_at,
      ]);
      zip.file('athlete_notes.csv', convertToCSV(noteHeaders, noteRows));
      totalCategories++;
    }

    // Add metadata JSON
    const metadata = {
      export_date: new Date().toISOString(),
      user_id: userId,
      user_email: userData.email,
      user_name: userData.full_name,
      data_categories_included: totalCategories,
      categories: [
        'user_profile',
        searches && searches.length > 0 ? 'saved_searches' : null,
        favorites && favorites.length > 0 ? 'favorites' : null,
        contacts && contacts.length > 0 ? 'contact_requests' : null,
        notifications && notifications.length > 0 ? 'notifications' : null,
        notes && notes.length > 0 ? 'athlete_notes' : null,
      ].filter(Boolean),
      export_format: 'CSV',
      gdpr_compliance: 'Article 20 - Right to Data Portability',
    };
    zip.file('gdpr_metadata.json', JSON.stringify(metadata, null, 2));

    // Generate ZIP blob
    const blob = await zip.generateAsync({ type: 'blob' });
    
    // Download ZIP
    const timestamp = new Date().toISOString().split('T')[0];
    const username = userData.email.split('@')[0];
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gdpr_export_${username}_${timestamp}.zip`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, count: totalCategories };
  } catch (error) {
    console.error('GDPR export error:', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
