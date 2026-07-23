export interface ParsedAthleteData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  country?: string;
  graduationYear?: string;
  sex?: string;
  golfClubTeam?: string;
  committed?: string;
  committedTo?: string;
  academicGpa?: string;
  sat?: string;
  duolingo?: string;
  toefl?: string;
  intendedMajors?: string;
  scoringAverage?: string;
  scoringAverageVsPar?: string;
  scoringAverageVsCourseRating?: string;
  frenchAdultRanking?: string;
  frenchRankingInTheirClass?: string;
  wagrRanking?: string;
  driveDistanceCarry?: string;
  sevenIronDistanceCarry?: string;
  maxClubHeadSpeed?: string;
  strengths?: string;
  areasOfImprovement?: string;
  preferencesBudget?: string;
  preferencesDivision?: string;
  preferencesRegion?: string;
  importanceLargeCity?: string;
  videoLinks?: string;
  profilePhoto?: string;
  status?: string;
  sourceSyncId?: string;
  otherInterests?: string;
  whyGoodRecruit?: string;
  somethingElseCoachesKnow?: string;
  instagramHandle?: string;
  starRating?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  error: string;
  value: string;
  suggestion: string;
}

// Parse CSV rows handling multi-line quoted fields properly
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote - add single quote to field
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentField.trim() || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Add last field and row if any
  if (currentField.trim() || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

export function parseCSV(csvText: string): { data: ParsedAthleteData[]; errors: ValidationError[] } {
  const rows = parseCSVRows(csvText);
  
  if (rows.length < 2) {
    return { data: [], errors: [{ row: 0, field: 'File', error: 'Empty file', value: '', suggestion: 'Provide valid CSV data' }] };
  }

  // Preserve underscores in headers for proper mapping
  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const data: ParsedAthleteData[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        field: 'Row',
        error: 'Column count mismatch',
        value: values.join(','),
        suggestion: `Expected ${headers.length} columns, got ${values.length}`
      });
      continue;
    }

    const rowData: any = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      // Treat "N/A" as empty/null
      rowData[header] = (value === 'N/A' || value === 'n/a') ? '' : value;
    });

    // Helper function to parse MM/DD/YYYY dates to YYYY-MM-DD
    const parseDate = (dateStr: string): string | undefined => {
      if (!dateStr || dateStr === 'N/A') return undefined;
      
      // Try MM/DD/YYYY format
      const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try YYYY-MM-DD format (already correct)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      return undefined;
    };

    // Helper function to normalize sex/gender values
    const normalizeSex = (value: string | undefined): string | undefined => {
      if (!value) return undefined;
      const lower = value.toLowerCase().trim();
      if (lower === 'male' || lower === 'm' || lower === 'men' || lower === 'man') return 'Men';
      if (lower === 'female' || lower === 'f' || lower === 'women' || lower === 'woman') return 'Women';
      return value; // Keep original if unrecognized
    };

    // Helper function to normalize status values
    const normalizeStatus = (value: string | undefined): string | undefined => {
      if (!value || value.trim() === '') return 'available';
      const lower = value.toLowerCase().trim();
      
      // Map common status values to the 4-state model
      if (lower === 'building' || lower === 'in_creation') return 'in_creation';
      if (lower === 'committed') return 'committed';
      if (lower === 'in college' || lower === 'in_college' || lower === 'archived') return 'in_college';
      // available / uncommitted / new / transfer (removed) → available
      return 'available';
    };

    // Helper function to normalize Instagram to full URL
    const normalizeInstagram = (value: string | undefined): string | null => {
      if (!value || value.trim() === '') return null;
      
      const trimmed = value.trim();
      
      // If it's already a full URL, return as-is
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      
      // If it's just a handle (with or without @), convert to URL
      const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      return `https://www.instagram.com/${handle}/`;
    };

    // Helper function to split "FirstName LastName" into separate fields
    const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
      if (!fullName || fullName.trim() === '') {
        return { firstName: '', lastName: '' };
      }
      
      const trimmed = fullName.trim();
      const parts = trimmed.split(/\s+/);
      
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
      }
      
      // First part is first name, rest is last name
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    };

    // Handle combined name field vs separate fields
    let firstName = '';
    let lastName = '';

    if (rowData.athlete) {
      // Format 2: Combined "FirstName LastName" in "Athlete" column
      const nameParts = splitFullName(rowData.athlete);
      firstName = nameParts.firstName;
      lastName = nameParts.lastName;
    } else {
      // Format 1: Separate first_name and last_name columns
      firstName = rowData.first_name || rowData.firstname || '';
      lastName = rowData.last_name || rowData.lastname || '';
    }

    // Map graduation year from "Year" or "graduation_year" - now supports comma-separated values
    const graduationYear = rowData.year || rowData.graduation_year || rowData.graduationyear || rowData.gradyear;

    // Handle Instagram - support both "Link Instagram" and "instagram_handle" columns
    const instagramRaw = rowData.link_instagram || rowData.linkinstagram || 
                         rowData.instagram_handle || rowData.instagramhandle || 
                         rowData.instagram;

    // Map CSV columns to athlete data (support both camelCase and snake_case)
    const athlete: ParsedAthleteData = {
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: parseDate(rowData.date_of_birth || rowData.dateofbirth || rowData.dob || rowData.birthdate),
      country: rowData.country,
      graduationYear: graduationYear,
      sex: normalizeSex(rowData.sex || rowData.gender),
      golfClubTeam: rowData.golf_club_team || rowData.golfclubteam || rowData.club,
      committed: rowData.committed,
      committedTo: rowData.committed_to || rowData.committedto,
      academicGpa: rowData.academic_gpa || rowData.gpa || rowData.academicgpa,
      sat: rowData.sat || rowData.satscore,
      duolingo: rowData.duolingo || rowData.duolingoscore,
      toefl: rowData.toefl || rowData.toeflscore,
      intendedMajors: rowData.intended_majors || rowData.intendedmajors || rowData.majors,
      scoringAverage: rowData.scoring_average || rowData.scoringaverage,
      scoringAverageVsPar: rowData.scoring_average_vs_par || rowData.scoringaveragevspar,
      scoringAverageVsCourseRating: rowData.scoring_average_vs_course_rating || rowData.scoringaveragevscourserating,
      
      // Rankings - support both column name formats, store AS-IS (full text)
      frenchAdultRanking: rowData.ranking_ffgolf_adulte || rowData.rankingffgolfadulte || 
                          rowData.french_adult_ranking || rowData.frenchadultranking,
      frenchRankingInTheirClass: rowData.ranking_ffgolf_in_the_class || rowData.rankingffgolfintheclass ||
                                 rowData.french_ranking_in_their_class || rowData.frenchrankingintheirclass,
      wagrRanking: rowData.wagr_ranking || rowData.wagrranking,
      driveDistanceCarry: rowData.drive_distance_carry || rowData.drivedistancecarry,
      sevenIronDistanceCarry: rowData.seven_iron_distance_carry || rowData.sevenirondistancecarry,
      maxClubHeadSpeed: rowData.max_club_head_speed || rowData.maxclubheadspeed,
      strengths: rowData.strengths,
      areasOfImprovement: rowData.areas_of_improvement || rowData.areasofimprovement,
      preferencesBudget: rowData.preferences_budget || rowData.preferencesbudget || rowData.budget,
      preferencesDivision: rowData.preferences_division || rowData.preferencesdivision || rowData.division,
      preferencesRegion: rowData.preferences_region || rowData.preferencesregion || rowData.region,
      importanceLargeCity: rowData.importance_large_city || rowData.importancelargecity,
      videoLinks: rowData.video_links || rowData.videolinks,
      profilePhoto: rowData.profile_photo || rowData.profilephoto,
      status: normalizeStatus(rowData.status),
      sourceSyncId: rowData.source_sync_id || rowData.sourcesyncid || rowData.id,
      otherInterests: rowData.other_interests || rowData.otherinterests,
      whyGoodRecruit: rowData.why_good_recruit || rowData.whygoodrecruit,
      somethingElseCoachesKnow: rowData.something_else_coaches_know || rowData.somethingelsecoachesknow,
      instagramHandle: normalizeInstagram(instagramRaw),
      starRating: rowData.star_rating || rowData.starrating || rowData.rating || rowData['starrating'],
    };

    // Validate required fields
    if (!athlete.firstName || !athlete.lastName) {
      errors.push({
        row: i + 1,
        field: 'Name',
        error: 'Missing required field',
        value: `${athlete.firstName} ${athlete.lastName}`,
        suggestion: 'First name and last name are required'
      });
      continue;
    }

    // Validate sex field - warn about possible incorrect assignments
    if (athlete.sex && athlete.firstName) {
      const femaleNames = ['ambre', 'jeanne', 'sarah', 'marie', 'louise', 'emma', 'chloe', 'lea', 'manon', 'alice', 'julie', 'camille', 'clara'];
      const firstNameLower = athlete.firstName.toLowerCase();
      
      if (athlete.sex === 'Men' && femaleNames.some(fn => firstNameLower.includes(fn))) {
        errors.push({
          row: i + 1,
          field: 'sex',
          error: 'Possible incorrect gender',
          value: `${athlete.firstName} marked as Men`,
          suggestion: 'Please verify - name suggests Women'
        });
      }
    }

    data.push(athlete);
  }

  return { data, errors };
}

export function generateCSVTemplate(): string {
  const headers = [
    'First Name*',
    'Last Name*',
    'Date of Birth',
    'Country',
    'Graduation Year',
    'Sex',
    'Golf Club/Team',
    'Committed',
    'Committed To',
    'Academic GPA',
    'SAT',
    'Duolingo',
    'TOEFL',
    'Intended Majors',
    'Scoring Average',
    'Scoring Average vs Par',
    'Scoring Average vs Course Rating',
    'French Adult Ranking',
    'French Ranking in Class',
    'WAGR Ranking',
    'Drive Distance Carry',
    '7 Iron Distance Carry',
    'Max Club Head Speed',
    'Strengths',
    'Areas of Improvement',
    'Budget',
    'Preferred Division',
    'Preferred Region',
    'Importance Large City',
    'Video Links',
    'Profile Photo URL',
    'Status',
    'Other Interests',
    'Why Good Recruit',
    'Something Else Coaches Know',
    'Star Rating'
  ];

  const exampleRow = [
    'Jean',
    'Dupont',
    '01/15/2006',
    'France',
    '2025',
    'Men',
    'Paris Golf Club',
    'false',
    '',
    '3.8',
    '1420',
    '130',
    '105',
    'Business, Sports Management',
    '72.5',
    '+0.5',
    '-1.2',
    '45',
    '12',
    '850',
    '265',
    '175',
    '112',
    'Consistent ball striking, mental toughness',
    'Short game around greens',
    '45000',
    'NCAA D1',
    'California, Florida',
    'Medium',
    'https://youtube.com/...',
    'https://example.com/photo.jpg',
    'Uncommitted',
    'Tennis, Photography',
    'Strong academic record with competitive golf',
    'Team captain, speaks 3 languages',
    '5'
  ];

  return headers.join(',') + '\n' + exampleRow.join(',');
}
