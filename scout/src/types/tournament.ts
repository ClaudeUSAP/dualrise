export interface Tournament {
  id: string;
  name: string; // Stores canonical name (generated)
  series_name: string; // Base tournament name
  series_type?: string; // Championship, Trophy, Cup, Grand Prix, etc.
  year: string;
  location: string; // NOT NULL
  country: string; // NOT NULL
  sex: 'Men' | 'Women'; // NOT NULL
  tournament_type: 'Junior' | 'Adult'; // NOT NULL
  category: 'National' | 'International' | 'National Team' | 'Club Competition' | 'PRO' | 'Collegiate';
  courseRating: number;
  slopeRating: number;
  par: number;
  yardage?: number;
  participatingAthletes: number;
  createdAt: Date;
  updatedAt: Date;
  resultsLink?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
  // Number of athletes with a result in this tournament (embedded count from
  // tournament_results). ~1 result per athlete, so this is the athlete count.
  resultCount?: number;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  athleteId: string;
  tournament?: Tournament;
  athlete?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  finalPosition: number;
  positionText?: string;
  fieldSize?: number;
  totalScore: number | null;
  scoreVsCourseRating: number;
  rounds: {
    round: number;
    score: number;
  }[];
  notes?: string;
  highlights?: string[];
  createdAt: Date;
  updatedAt: Date;
  importOrder?: number;
}

export interface TournamentFilters {
  searchQuery?: string;
  year?: string;
  type?: string[];
  location?: string;
}
