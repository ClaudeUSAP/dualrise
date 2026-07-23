import { SearchFilters } from '@/types/athlete';
import { supabase } from '@/integrations/supabase/client';

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilters;
  createdAt: Date;
  updatedAt: Date;
  matchCount?: number;
  isAlertEnabled: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  lastRun?: Date;
  newMatchesCount?: number;
}

class SavedSearchService {
  /**
   * Get all saved searches for the authenticated user
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to access saved searches');
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved searches:', error);
      throw error;
    }

    return (data || []).map(search => ({
      id: search.id,
      name: search.name,
      description: search.description || undefined,
      filters: (search.search_criteria as SearchFilters) || {},
      createdAt: new Date(search.created_at),
      updatedAt: new Date(search.updated_at),
      matchCount: search.match_count,
      isAlertEnabled: search.is_alert_enabled,
      alertFrequency: search.alert_frequency as 'immediate' | 'daily' | 'weekly',
      lastRun: search.last_run ? new Date(search.last_run) : undefined,
      newMatchesCount: search.new_matches_count
    }));
  }

  /**
   * Save a new search for the authenticated user
   */
  async saveSearch(name: string, filters: SearchFilters, description?: string): Promise<SavedSearch> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to save searches');
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert([{
        coach_id: user.id,
        name,
        description,
        search_criteria: filters as any,
        is_alert_enabled: false,
        alert_frequency: 'weekly',
        match_count: 0,
        new_matches_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving search:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      filters: (data.search_criteria as SearchFilters) || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      matchCount: data.match_count,
      isAlertEnabled: data.is_alert_enabled,
      alertFrequency: data.alert_frequency as 'immediate' | 'daily' | 'weekly',
      lastRun: data.last_run ? new Date(data.last_run) : undefined,
      newMatchesCount: data.new_matches_count
    };
  }

  /**
   * Update an existing saved search
   */
  async updateSearch(id: string, updates: Partial<Omit<SavedSearch, 'id' | 'createdAt'>>): Promise<SavedSearch> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.filters !== undefined) updateData.search_criteria = updates.filters;
    if (updates.isAlertEnabled !== undefined) updateData.is_alert_enabled = updates.isAlertEnabled;
    if (updates.alertFrequency !== undefined) updateData.alert_frequency = updates.alertFrequency;
    if (updates.matchCount !== undefined) updateData.match_count = updates.matchCount;
    if (updates.newMatchesCount !== undefined) updateData.new_matches_count = updates.newMatchesCount;
    if (updates.lastRun !== undefined) updateData.last_run = updates.lastRun.toISOString();

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating search:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      filters: (data.search_criteria as SearchFilters) || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      matchCount: data.match_count,
      isAlertEnabled: data.is_alert_enabled,
      alertFrequency: data.alert_frequency as 'immediate' | 'daily' | 'weekly',
      lastRun: data.last_run ? new Date(data.last_run) : undefined,
      newMatchesCount: data.new_matches_count
    };
  }

  /**
   * Delete a saved search
   */
  async deleteSearch(id: string): Promise<void> {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting search:', error);
      throw error;
    }
  }

  /**
   * Mark a search as viewed (reset new matches count)
   */
  async markSearchAsViewed(id: string): Promise<void> {
    const { error } = await supabase
      .from('saved_searches')
      .update({ 
        new_matches_count: 0,
        last_run: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking search as viewed:', error);
      throw error;
    }
  }

  /**
   * Toggle alert notifications for a saved search
   */
  async toggleSearchAlert(id: string): Promise<SavedSearch> {
    const { data: currentSearch, error: fetchError } = await supabase
      .from('saved_searches')
      .select('is_alert_enabled')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching search:', fetchError);
      throw fetchError;
    }

    return this.updateSearch(id, { isAlertEnabled: !currentSearch.is_alert_enabled });
  }

  /**
   * Run a saved search immediately
   */
  async runSearchNow(id: string): Promise<void> {
    const { error } = await supabase.functions.invoke('run-saved-search-alerts', {
      body: { 
        searchId: id,
        force: true
      }
    });
    
    if (error) {
      console.error('Error running search:', error);
      throw error;
    }
  }
}

export const savedSearchService = new SavedSearchService();