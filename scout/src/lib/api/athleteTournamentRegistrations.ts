import { supabase } from "@/integrations/supabase/client";

export interface AthleteTournamentRegistration {
  id: string;
  athlete_id: string;
  tournament_id: string;
  registration_status: 'registered' | 'confirmed' | 'withdrawn' | 'waitlisted';
  registration_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AthleteRegistrationWithTournament extends AthleteTournamentRegistration {
  tournament?: any;
}

export const listAthleteRegistrations = async (athleteId: string): Promise<AthleteRegistrationWithTournament[]> => {
  const { data, error } = await supabase
    .from('athlete_tournament_registrations')
    .select(`
      *,
      tournament:tournaments(*)
    `)
    .eq('athlete_id', athleteId)
    .order('tournament(start_date)', { ascending: true });

  if (error) {
    console.error('Error fetching athlete registrations:', error);
    throw error;
  }

  return (data || []) as AthleteRegistrationWithTournament[];
};

export const createRegistration = async (
  athleteId: string,
  tournamentId: string,
  status: string = 'registered',
  notes?: string
) => {
  const { data, error } = await supabase
    .from('athlete_tournament_registrations')
    .insert({
      athlete_id: athleteId,
      tournament_id: tournamentId,
      registration_status: status,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating registration:', error);
    throw error;
  }

  return data;
};

export const updateRegistration = async (
  id: string,
  data: Partial<AthleteTournamentRegistration>
) => {
  const { error } = await supabase
    .from('athlete_tournament_registrations')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error updating registration:', error);
    throw error;
  }
};

export const deleteRegistration = async (id: string) => {
  const { error } = await supabase
    .from('athlete_tournament_registrations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting registration:', error);
    throw error;
  }
};

export const bulkDeleteRegistrations = async (ids: string[]) => {
  const { error } = await supabase
    .from('athlete_tournament_registrations')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error bulk deleting registrations:', error);
    throw error;
  }
};
