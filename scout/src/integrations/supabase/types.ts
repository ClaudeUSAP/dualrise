export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_job_state: {
        Row: {
          job_name: string
          last_run: string | null
        }
        Insert: {
          job_name: string
          last_run?: string | null
        }
        Update: {
          job_name?: string
          last_run?: string | null
        }
        Relationships: []
      }
      athlete_notes: {
        Row: {
          athlete_id: string | null
          category: string | null
          coach_id: string | null
          created_at: string | null
          id: string
          note_text: string
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          category?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          note_text: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          category?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          note_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_statistics: {
        Row: {
          athlete_id: string | null
          calculated_value: number | null
          created_at: string | null
          id: string
          last_calculated: string | null
          metric_type: string
          period_type: string
          period_value: string | null
          tournaments_included: number | null
        }
        Insert: {
          athlete_id?: string | null
          calculated_value?: number | null
          created_at?: string | null
          id?: string
          last_calculated?: string | null
          metric_type: string
          period_type: string
          period_value?: string | null
          tournaments_included?: number | null
        }
        Update: {
          athlete_id?: string | null
          calculated_value?: number | null
          created_at?: string | null
          id?: string
          last_calculated?: string | null
          metric_type?: string
          period_type?: string
          period_value?: string | null
          tournaments_included?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_statistics_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_statistics_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_tournament_registrations: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          notes: string | null
          registration_date: string | null
          registration_status: string | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          registration_date?: string | null
          registration_status?: string | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          registration_date?: string | null
          registration_status?: string | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tournament_registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tournament_registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          academic_gpa: number | null
          agent_id: string | null
          agent_secondary_id: string | null
          areas_of_improvement: string | null
          backhand_type: string | null
          best_recent_period: string | null
          best_recent_period_raw: string | null
          best_recent_scoring_avg: string | null
          best_recent_scoring_avg_raw: string | null
          best_results: string | null
          city: string | null
          club_team: string | null
          commit_date: string | null
          committed: boolean | null
          committed_to: string | null
          committed_university_id: string | null
          country: string | null
          cover_photo: string | null
          created_at: string | null
          crm_status: string | null
          date_of_birth: string | null
          default_scoring_period_type: string | null
          default_scoring_period_value: string | null
          dominant_hand: string | null
          drive_distance_carry: string | null
          duolingo: string | null
          eligibility_years: number | null
          email: string | null
          featured: boolean | null
          first_name: string
          french_adult_ranking: string | null
          french_adult_ranking_at_commit: string | null
          french_ranking_1yr_before_college: string | null
          french_ranking_at_college_start: string | null
          french_ranking_in_their_class: string | null
          golf_club_team: string | null
          golf_data_link: string | null
          graduation_year: string | null
          height_cm: number | null
          high_school: string | null
          high_school_year: string | null
          id: string
          importance_large_city: string | null
          instagram_handle: string | null
          intended_majors: string | null
          itf_junior_ranking: string | null
          last_name: string
          max_club_head_speed: number | null
          national_ranking: string | null
          national_ranking_country: string | null
          objectives: string | null
          other_interests: string | null
          phone: string | null
          phys_endurance: number | null
          phys_flexibility: number | null
          phys_strength: number | null
          play_style: string | null
          preferences_budget: string | null
          preferences_division: string | null
          preferences_region: string | null
          preferred_states: string | null
          preferred_surface: string | null
          profile_photo: string | null
          questionnaire_notes: string | null
          recent_results: string | null
          sat: string | null
          scoreboard_current_rank: string | null
          scoreboard_current_rounds: number | null
          scoreboard_current_score: string | null
          scoreboard_freshman_end_rank: string | null
          scoreboard_freshman_end_score: string | null
          scoreboard_id: string | null
          scoreboard_junior_end_rank: string | null
          scoreboard_junior_end_score: string | null
          scoreboard_senior_end_rank: string | null
          scoreboard_senior_end_score: string | null
          scoreboard_sophomore_end_rank: string | null
          scoreboard_sophomore_end_score: string | null
          scoring_average: string | null
          scoring_average_override: boolean | null
          scoring_average_vs_course_rating: string | null
          scoring_average_vs_par: string | null
          scoring_avg_all_time_raw: string | null
          scoring_avg_current_year_raw: string | null
          scoring_avg_last_10_raw: string | null
          scoring_avg_last_3_raw: string | null
          scoring_avg_last_5_raw: string | null
          scoring_avg_last_7: string | null
          scoring_avg_last_7_raw: string | null
          scoring_avg_vs_cr_current_year: string | null
          scoring_avg_vs_cr_last_10: string | null
          scoring_avg_vs_cr_last_3: string | null
          scoring_avg_vs_cr_last_5: string | null
          scoring_avg_vs_cr_last_7: string | null
          scoring_avg_vs_cr_last_update: string | null
          scoring_avg_vs_cr_override: boolean | null
          scoring_avg_vs_par_all_time: string | null
          scoring_avg_vs_par_current_year: string | null
          scoring_avg_vs_par_last_10: string | null
          scoring_avg_vs_par_last_3: string | null
          scoring_avg_vs_par_last_5: string | null
          scoring_avg_vs_par_last_7: string | null
          seven_iron_distance_carry: string | null
          sex: string | null
          signing_season: string | null
          slug: string | null
          something_else_coaches_know: string | null
          source_sync_id: string | null
          star_rating: number | null
          star_rating_at_commit: number | null
          status: string | null
          status_expires_at: string | null
          strengths: string | null
          student_type: string | null
          swing_coach: string | null
          tac_adaptability: number | null
          tac_anticipation: number | null
          tac_decision_making: number | null
          tac_mental_resilience: number | null
          tech_backhand: number | null
          tech_baseline: number | null
          tech_forehand: number | null
          tech_net: number | null
          tech_serve: number | null
          tech_smash: number | null
          tech_volley: number | null
          tennis_iq_comments: string | null
          toefl: string | null
          tournament_results_link: string | null
          trackman_report_link: string | null
          transfer_from_division: string | null
          transfer_from_school: string | null
          transfer_individual_ranking: string | null
          updated_at: string | null
          utr: number | null
          utr_profile_link: string | null
          video_links: string | null
          virement_1_eur: number | null
          virement_2_eur: number | null
          virement_last_synced_at: string | null
          wagr_ranking: string | null
          weaknesses: string | null
          weight_kg: number | null
          why_good_recruit: string | null
          wtn: number | null
          wtn_profile_link: string | null
        }
        Insert: {
          academic_gpa?: number | null
          agent_id?: string | null
          agent_secondary_id?: string | null
          areas_of_improvement?: string | null
          backhand_type?: string | null
          best_recent_period?: string | null
          best_recent_period_raw?: string | null
          best_recent_scoring_avg?: string | null
          best_recent_scoring_avg_raw?: string | null
          best_results?: string | null
          city?: string | null
          club_team?: string | null
          commit_date?: string | null
          committed?: boolean | null
          committed_to?: string | null
          committed_university_id?: string | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          crm_status?: string | null
          date_of_birth?: string | null
          default_scoring_period_type?: string | null
          default_scoring_period_value?: string | null
          dominant_hand?: string | null
          drive_distance_carry?: string | null
          duolingo?: string | null
          eligibility_years?: number | null
          email?: string | null
          featured?: boolean | null
          first_name: string
          french_adult_ranking?: string | null
          french_adult_ranking_at_commit?: string | null
          french_ranking_1yr_before_college?: string | null
          french_ranking_at_college_start?: string | null
          french_ranking_in_their_class?: string | null
          golf_club_team?: string | null
          golf_data_link?: string | null
          graduation_year?: string | null
          height_cm?: number | null
          high_school?: string | null
          high_school_year?: string | null
          id?: string
          importance_large_city?: string | null
          instagram_handle?: string | null
          intended_majors?: string | null
          itf_junior_ranking?: string | null
          last_name: string
          max_club_head_speed?: number | null
          national_ranking?: string | null
          national_ranking_country?: string | null
          objectives?: string | null
          other_interests?: string | null
          phone?: string | null
          phys_endurance?: number | null
          phys_flexibility?: number | null
          phys_strength?: number | null
          play_style?: string | null
          preferences_budget?: string | null
          preferences_division?: string | null
          preferences_region?: string | null
          preferred_states?: string | null
          preferred_surface?: string | null
          profile_photo?: string | null
          questionnaire_notes?: string | null
          recent_results?: string | null
          sat?: string | null
          scoreboard_current_rank?: string | null
          scoreboard_current_rounds?: number | null
          scoreboard_current_score?: string | null
          scoreboard_freshman_end_rank?: string | null
          scoreboard_freshman_end_score?: string | null
          scoreboard_id?: string | null
          scoreboard_junior_end_rank?: string | null
          scoreboard_junior_end_score?: string | null
          scoreboard_senior_end_rank?: string | null
          scoreboard_senior_end_score?: string | null
          scoreboard_sophomore_end_rank?: string | null
          scoreboard_sophomore_end_score?: string | null
          scoring_average?: string | null
          scoring_average_override?: boolean | null
          scoring_average_vs_course_rating?: string | null
          scoring_average_vs_par?: string | null
          scoring_avg_all_time_raw?: string | null
          scoring_avg_current_year_raw?: string | null
          scoring_avg_last_10_raw?: string | null
          scoring_avg_last_3_raw?: string | null
          scoring_avg_last_5_raw?: string | null
          scoring_avg_last_7?: string | null
          scoring_avg_last_7_raw?: string | null
          scoring_avg_vs_cr_current_year?: string | null
          scoring_avg_vs_cr_last_10?: string | null
          scoring_avg_vs_cr_last_3?: string | null
          scoring_avg_vs_cr_last_5?: string | null
          scoring_avg_vs_cr_last_7?: string | null
          scoring_avg_vs_cr_last_update?: string | null
          scoring_avg_vs_cr_override?: boolean | null
          scoring_avg_vs_par_all_time?: string | null
          scoring_avg_vs_par_current_year?: string | null
          scoring_avg_vs_par_last_10?: string | null
          scoring_avg_vs_par_last_3?: string | null
          scoring_avg_vs_par_last_5?: string | null
          scoring_avg_vs_par_last_7?: string | null
          seven_iron_distance_carry?: string | null
          sex?: string | null
          signing_season?: string | null
          slug?: string | null
          something_else_coaches_know?: string | null
          source_sync_id?: string | null
          star_rating?: number | null
          star_rating_at_commit?: number | null
          status?: string | null
          status_expires_at?: string | null
          strengths?: string | null
          student_type?: string | null
          swing_coach?: string | null
          tac_adaptability?: number | null
          tac_anticipation?: number | null
          tac_decision_making?: number | null
          tac_mental_resilience?: number | null
          tech_backhand?: number | null
          tech_baseline?: number | null
          tech_forehand?: number | null
          tech_net?: number | null
          tech_serve?: number | null
          tech_smash?: number | null
          tech_volley?: number | null
          tennis_iq_comments?: string | null
          toefl?: string | null
          tournament_results_link?: string | null
          trackman_report_link?: string | null
          transfer_from_division?: string | null
          transfer_from_school?: string | null
          transfer_individual_ranking?: string | null
          updated_at?: string | null
          utr?: number | null
          utr_profile_link?: string | null
          video_links?: string | null
          virement_1_eur?: number | null
          virement_2_eur?: number | null
          virement_last_synced_at?: string | null
          wagr_ranking?: string | null
          weaknesses?: string | null
          weight_kg?: number | null
          why_good_recruit?: string | null
          wtn?: number | null
          wtn_profile_link?: string | null
        }
        Update: {
          academic_gpa?: number | null
          agent_id?: string | null
          agent_secondary_id?: string | null
          areas_of_improvement?: string | null
          backhand_type?: string | null
          best_recent_period?: string | null
          best_recent_period_raw?: string | null
          best_recent_scoring_avg?: string | null
          best_recent_scoring_avg_raw?: string | null
          best_results?: string | null
          city?: string | null
          club_team?: string | null
          commit_date?: string | null
          committed?: boolean | null
          committed_to?: string | null
          committed_university_id?: string | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          crm_status?: string | null
          date_of_birth?: string | null
          default_scoring_period_type?: string | null
          default_scoring_period_value?: string | null
          dominant_hand?: string | null
          drive_distance_carry?: string | null
          duolingo?: string | null
          eligibility_years?: number | null
          email?: string | null
          featured?: boolean | null
          first_name?: string
          french_adult_ranking?: string | null
          french_adult_ranking_at_commit?: string | null
          french_ranking_1yr_before_college?: string | null
          french_ranking_at_college_start?: string | null
          french_ranking_in_their_class?: string | null
          golf_club_team?: string | null
          golf_data_link?: string | null
          graduation_year?: string | null
          height_cm?: number | null
          high_school?: string | null
          high_school_year?: string | null
          id?: string
          importance_large_city?: string | null
          instagram_handle?: string | null
          intended_majors?: string | null
          itf_junior_ranking?: string | null
          last_name?: string
          max_club_head_speed?: number | null
          national_ranking?: string | null
          national_ranking_country?: string | null
          objectives?: string | null
          other_interests?: string | null
          phone?: string | null
          phys_endurance?: number | null
          phys_flexibility?: number | null
          phys_strength?: number | null
          play_style?: string | null
          preferences_budget?: string | null
          preferences_division?: string | null
          preferences_region?: string | null
          preferred_states?: string | null
          preferred_surface?: string | null
          profile_photo?: string | null
          questionnaire_notes?: string | null
          recent_results?: string | null
          sat?: string | null
          scoreboard_current_rank?: string | null
          scoreboard_current_rounds?: number | null
          scoreboard_current_score?: string | null
          scoreboard_freshman_end_rank?: string | null
          scoreboard_freshman_end_score?: string | null
          scoreboard_id?: string | null
          scoreboard_junior_end_rank?: string | null
          scoreboard_junior_end_score?: string | null
          scoreboard_senior_end_rank?: string | null
          scoreboard_senior_end_score?: string | null
          scoreboard_sophomore_end_rank?: string | null
          scoreboard_sophomore_end_score?: string | null
          scoring_average?: string | null
          scoring_average_override?: boolean | null
          scoring_average_vs_course_rating?: string | null
          scoring_average_vs_par?: string | null
          scoring_avg_all_time_raw?: string | null
          scoring_avg_current_year_raw?: string | null
          scoring_avg_last_10_raw?: string | null
          scoring_avg_last_3_raw?: string | null
          scoring_avg_last_5_raw?: string | null
          scoring_avg_last_7?: string | null
          scoring_avg_last_7_raw?: string | null
          scoring_avg_vs_cr_current_year?: string | null
          scoring_avg_vs_cr_last_10?: string | null
          scoring_avg_vs_cr_last_3?: string | null
          scoring_avg_vs_cr_last_5?: string | null
          scoring_avg_vs_cr_last_7?: string | null
          scoring_avg_vs_cr_last_update?: string | null
          scoring_avg_vs_cr_override?: boolean | null
          scoring_avg_vs_par_all_time?: string | null
          scoring_avg_vs_par_current_year?: string | null
          scoring_avg_vs_par_last_10?: string | null
          scoring_avg_vs_par_last_3?: string | null
          scoring_avg_vs_par_last_5?: string | null
          scoring_avg_vs_par_last_7?: string | null
          seven_iron_distance_carry?: string | null
          sex?: string | null
          signing_season?: string | null
          slug?: string | null
          something_else_coaches_know?: string | null
          source_sync_id?: string | null
          star_rating?: number | null
          star_rating_at_commit?: number | null
          status?: string | null
          status_expires_at?: string | null
          strengths?: string | null
          student_type?: string | null
          swing_coach?: string | null
          tac_adaptability?: number | null
          tac_anticipation?: number | null
          tac_decision_making?: number | null
          tac_mental_resilience?: number | null
          tech_backhand?: number | null
          tech_baseline?: number | null
          tech_forehand?: number | null
          tech_net?: number | null
          tech_serve?: number | null
          tech_smash?: number | null
          tech_volley?: number | null
          tennis_iq_comments?: string | null
          toefl?: string | null
          tournament_results_link?: string | null
          trackman_report_link?: string | null
          transfer_from_division?: string | null
          transfer_from_school?: string | null
          transfer_individual_ranking?: string | null
          updated_at?: string | null
          utr?: number | null
          utr_profile_link?: string | null
          video_links?: string | null
          virement_1_eur?: number | null
          virement_2_eur?: number | null
          virement_last_synced_at?: string | null
          wagr_ranking?: string | null
          weaknesses?: string | null
          weight_kg?: number | null
          why_good_recruit?: string | null
          wtn?: number | null
          wtn_profile_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_agent_secondary_id_fkey"
            columns: ["agent_secondary_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_agent_secondary_id_fkey"
            columns: ["agent_secondary_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_committed_university_id_fkey"
            columns: ["committed_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          admin_notes: string | null
          athlete_id: string | null
          coach_id: string | null
          created_at: string | null
          id: string
          interest_level: string
          message: string
          preferred_contact: string | null
          responded_at: string | null
          status: string | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_notes?: string | null
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          interest_level: string
          message: string
          preferred_contact?: string | null
          responded_at?: string | null
          status?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_notes?: string | null
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          interest_level?: string
          message?: string
          preferred_contact?: string | null
          responded_at?: string | null
          status?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          metadata: Json | null
          next_retry_at: string | null
          recipient_email: string
          retry_count: number | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          recipient_email: string
          retry_count?: number | null
          status: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          recipient_email?: string
          retry_count?: number | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          athlete_id: string | null
          coach_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_priority: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          related_athlete_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_priority?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          related_athlete_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_priority?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          related_athlete_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_athlete_id_fkey"
            columns: ["related_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_athlete_id_fkey"
            columns: ["related_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_frequency: string | null
          coach_id: string
          created_at: string | null
          description: string | null
          id: string
          is_alert_enabled: boolean | null
          last_notification_sent: string | null
          last_run: string | null
          match_count: number | null
          name: string
          new_matches_count: number | null
          search_criteria: Json
          updated_at: string | null
        }
        Insert: {
          alert_frequency?: string | null
          coach_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_alert_enabled?: boolean | null
          last_notification_sent?: string | null
          last_run?: string | null
          match_count?: number | null
          name: string
          new_matches_count?: number | null
          search_criteria?: Json
          updated_at?: string | null
        }
        Update: {
          alert_frequency?: string | null
          coach_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_alert_enabled?: boolean | null
          last_notification_sent?: string | null
          last_run?: string | null
          match_count?: number | null
          name?: string
          new_matches_count?: number | null
          search_criteria?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      search_notifications: {
        Row: {
          coach_id: string
          content: Json | null
          error_message: string | null
          id: string
          notification_type: string
          saved_search_id: string
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          coach_id: string
          content?: Json | null
          error_message?: string | null
          id?: string
          notification_type: string
          saved_search_id: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          coach_id?: string
          content?: Json | null
          error_message?: string | null
          id?: string
          notification_type?: string
          saved_search_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_notifications_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_run_history: {
        Row: {
          athlete_ids: string | null
          athlete_signatures: Json | null
          id: string
          improved_athletes_count: number | null
          matches_found: number | null
          new_athletes_count: number | null
          new_matches: number | null
          notification_sent: boolean | null
          removed_athletes_count: number | null
          run_at: string | null
          saved_search_id: string
        }
        Insert: {
          athlete_ids?: string | null
          athlete_signatures?: Json | null
          id?: string
          improved_athletes_count?: number | null
          matches_found?: number | null
          new_athletes_count?: number | null
          new_matches?: number | null
          notification_sent?: boolean | null
          removed_athletes_count?: number | null
          run_at?: string | null
          saved_search_id: string
        }
        Update: {
          athlete_ids?: string | null
          athlete_signatures?: Json | null
          id?: string
          improved_athletes_count?: number | null
          matches_found?: number | null
          new_athletes_count?: number | null
          new_matches?: number | null
          notification_sent?: boolean | null
          removed_athletes_count?: number | null
          run_at?: string | null
          saved_search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_run_history_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_results: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          field_size: number | null
          id: string
          import_order: number | null
          match_result: string | null
          match_score: string | null
          notes: string | null
          opponent_name: string | null
          opponent_utr: number | null
          position: number | null
          position_text: string | null
          round_reached: string | null
          rounds: string | null
          total_score: number | null
          tournament_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          field_size?: number | null
          id?: string
          import_order?: number | null
          match_result?: string | null
          match_score?: string | null
          notes?: string | null
          opponent_name?: string | null
          opponent_utr?: number | null
          position?: number | null
          position_text?: string | null
          round_reached?: string | null
          rounds?: string | null
          total_score?: number | null
          tournament_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          field_size?: number | null
          id?: string
          import_order?: number | null
          match_result?: string | null
          match_score?: string | null
          notes?: string | null
          opponent_name?: string | null
          opponent_utr?: number | null
          position?: number | null
          position_text?: string | null
          round_reached?: string | null
          rounds?: string | null
          total_score?: number | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          category: string
          country: string
          course_par: string | null
          course_rating: string | null
          course_slope: string | null
          created_at: string | null
          draw_size: number | null
          end_date: string | null
          field_size: string | null
          grade: string | null
          id: string
          location: string | null
          name: string
          raw_date_string: string | null
          results_link: string | null
          series_name: string
          series_type: string | null
          sex: string
          start_date: string | null
          status: string | null
          surface: string | null
          tournament_type: string
          yardage: string | null
          year: string
        }
        Insert: {
          category?: string
          country: string
          course_par?: string | null
          course_rating?: string | null
          course_slope?: string | null
          created_at?: string | null
          draw_size?: number | null
          end_date?: string | null
          field_size?: string | null
          grade?: string | null
          id?: string
          location?: string | null
          name: string
          raw_date_string?: string | null
          results_link?: string | null
          series_name: string
          series_type?: string | null
          sex: string
          start_date?: string | null
          status?: string | null
          surface?: string | null
          tournament_type?: string
          yardage?: string | null
          year?: string
        }
        Update: {
          category?: string
          country?: string
          course_par?: string | null
          course_rating?: string | null
          course_slope?: string | null
          created_at?: string | null
          draw_size?: number | null
          end_date?: string | null
          field_size?: string | null
          grade?: string | null
          id?: string
          location?: string | null
          name?: string
          raw_date_string?: string | null
          results_link?: string | null
          series_name?: string
          series_type?: string | null
          sex?: string
          start_date?: string | null
          status?: string | null
          surface?: string | null
          tournament_type?: string
          yardage?: string | null
          year?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string | null
          division: string | null
          gender: string | null
          id: string
          master_school_id: string | null
          name: string
          scoreboard_team_id: number | null
          state: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          division?: string | null
          gender?: string | null
          id?: string
          master_school_id?: string | null
          name: string
          scoreboard_team_id?: number | null
          state?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          division?: string | null
          gender?: string | null
          id?: string
          master_school_id?: string | null
          name?: string
          scoreboard_team_id?: number | null
          state?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          brochure_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string
          id: string
          last_login: string | null
          last_name: string | null
          phone: string | null
          position: string | null
          recruiting_needs: string | null
          school_name: string | null
          status: string
          university_id: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          brochure_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name: string
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          position?: string | null
          recruiting_needs?: string | null
          school_name?: string | null
          status?: string
          university_id?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          brochure_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          position?: string | null
          recruiting_needs?: string | null
          school_name?: string | null
          status?: string
          university_id?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_public_info: {
        Row: {
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      athletes_safe: {
        Row: {
          academic_gpa: number | null
          areas_of_improvement: string | null
          backhand_type: string | null
          best_recent_period: string | null
          best_recent_period_raw: string | null
          best_recent_scoring_avg: string | null
          best_recent_scoring_avg_raw: string | null
          best_results: string | null
          city: string | null
          club_team: string | null
          commit_date: string | null
          committed: boolean | null
          committed_to: string | null
          country: string | null
          cover_photo: string | null
          created_at: string | null
          date_of_birth: string | null
          default_scoring_period_type: string | null
          default_scoring_period_value: string | null
          dominant_hand: string | null
          drive_distance_carry: string | null
          duolingo: string | null
          eligibility_years: number | null
          email: string | null
          featured: boolean | null
          first_name: string | null
          french_adult_ranking: string | null
          french_adult_ranking_at_commit: string | null
          french_ranking_1yr_before_college: string | null
          french_ranking_in_their_class: string | null
          golf_club_team: string | null
          golf_data_link: string | null
          graduation_year: string | null
          height_cm: number | null
          high_school: string | null
          high_school_year: string | null
          id: string | null
          importance_large_city: string | null
          instagram_handle: string | null
          intended_majors: string | null
          itf_junior_ranking: string | null
          last_name: string | null
          max_club_head_speed: number | null
          national_ranking: string | null
          national_ranking_country: string | null
          objectives: string | null
          other_interests: string | null
          phone: string | null
          phys_endurance: number | null
          phys_flexibility: number | null
          phys_strength: number | null
          play_style: string | null
          preferences_budget: string | null
          preferences_division: string | null
          preferences_region: string | null
          preferred_states: string | null
          preferred_surface: string | null
          profile_photo: string | null
          recent_results: string | null
          sat: string | null
          scoreboard_current_rank: string | null
          scoring_average: string | null
          scoring_average_override: boolean | null
          scoring_average_vs_course_rating: string | null
          scoring_average_vs_par: string | null
          scoring_avg_all_time_raw: string | null
          scoring_avg_current_year_raw: string | null
          scoring_avg_last_10_raw: string | null
          scoring_avg_last_3_raw: string | null
          scoring_avg_last_5_raw: string | null
          scoring_avg_last_7: string | null
          scoring_avg_last_7_raw: string | null
          scoring_avg_vs_cr_current_year: string | null
          scoring_avg_vs_cr_last_10: string | null
          scoring_avg_vs_cr_last_3: string | null
          scoring_avg_vs_cr_last_5: string | null
          scoring_avg_vs_cr_last_7: string | null
          scoring_avg_vs_cr_last_update: string | null
          scoring_avg_vs_cr_override: boolean | null
          scoring_avg_vs_par_all_time: string | null
          scoring_avg_vs_par_current_year: string | null
          scoring_avg_vs_par_last_10: string | null
          scoring_avg_vs_par_last_3: string | null
          scoring_avg_vs_par_last_5: string | null
          scoring_avg_vs_par_last_7: string | null
          seven_iron_distance_carry: string | null
          sex: string | null
          slug: string | null
          something_else_coaches_know: string | null
          source_sync_id: string | null
          star_rating: number | null
          star_rating_at_commit: number | null
          status: string | null
          status_expires_at: string | null
          strengths: string | null
          student_type: string | null
          swing_coach: string | null
          tac_adaptability: number | null
          tac_anticipation: number | null
          tac_decision_making: number | null
          tac_mental_resilience: number | null
          tech_backhand: number | null
          tech_baseline: number | null
          tech_forehand: number | null
          tech_net: number | null
          tech_serve: number | null
          tech_smash: number | null
          tech_volley: number | null
          tennis_iq_comments: string | null
          toefl: string | null
          tournament_results_link: string | null
          trackman_report_link: string | null
          transfer_from_division: string | null
          transfer_from_school: string | null
          transfer_individual_ranking: string | null
          updated_at: string | null
          utr: number | null
          utr_profile_link: string | null
          video_links: string | null
          wagr_ranking: string | null
          weaknesses: string | null
          weight_kg: number | null
          why_good_recruit: string | null
          wtn: number | null
          wtn_profile_link: string | null
        }
        Insert: {
          academic_gpa?: number | null
          areas_of_improvement?: string | null
          backhand_type?: string | null
          best_recent_period?: string | null
          best_recent_period_raw?: string | null
          best_recent_scoring_avg?: string | null
          best_recent_scoring_avg_raw?: string | null
          best_results?: string | null
          city?: string | null
          club_team?: string | null
          commit_date?: string | null
          committed?: boolean | null
          committed_to?: string | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          date_of_birth?: never
          default_scoring_period_type?: string | null
          default_scoring_period_value?: string | null
          dominant_hand?: string | null
          drive_distance_carry?: string | null
          duolingo?: string | null
          eligibility_years?: number | null
          email?: never
          featured?: boolean | null
          first_name?: string | null
          french_adult_ranking?: string | null
          french_adult_ranking_at_commit?: string | null
          french_ranking_1yr_before_college?: string | null
          french_ranking_in_their_class?: string | null
          golf_club_team?: string | null
          golf_data_link?: string | null
          graduation_year?: string | null
          height_cm?: number | null
          high_school?: string | null
          high_school_year?: string | null
          id?: string | null
          importance_large_city?: string | null
          instagram_handle?: string | null
          intended_majors?: string | null
          itf_junior_ranking?: string | null
          last_name?: string | null
          max_club_head_speed?: number | null
          national_ranking?: string | null
          national_ranking_country?: string | null
          objectives?: string | null
          other_interests?: string | null
          phone?: never
          phys_endurance?: number | null
          phys_flexibility?: number | null
          phys_strength?: number | null
          play_style?: string | null
          preferences_budget?: string | null
          preferences_division?: string | null
          preferences_region?: string | null
          preferred_states?: string | null
          preferred_surface?: string | null
          profile_photo?: string | null
          recent_results?: string | null
          sat?: string | null
          scoreboard_current_rank?: string | null
          scoring_average?: string | null
          scoring_average_override?: boolean | null
          scoring_average_vs_course_rating?: string | null
          scoring_average_vs_par?: string | null
          scoring_avg_all_time_raw?: string | null
          scoring_avg_current_year_raw?: string | null
          scoring_avg_last_10_raw?: string | null
          scoring_avg_last_3_raw?: string | null
          scoring_avg_last_5_raw?: string | null
          scoring_avg_last_7?: string | null
          scoring_avg_last_7_raw?: string | null
          scoring_avg_vs_cr_current_year?: string | null
          scoring_avg_vs_cr_last_10?: string | null
          scoring_avg_vs_cr_last_3?: string | null
          scoring_avg_vs_cr_last_5?: string | null
          scoring_avg_vs_cr_last_7?: string | null
          scoring_avg_vs_cr_last_update?: string | null
          scoring_avg_vs_cr_override?: boolean | null
          scoring_avg_vs_par_all_time?: string | null
          scoring_avg_vs_par_current_year?: string | null
          scoring_avg_vs_par_last_10?: string | null
          scoring_avg_vs_par_last_3?: string | null
          scoring_avg_vs_par_last_5?: string | null
          scoring_avg_vs_par_last_7?: string | null
          seven_iron_distance_carry?: string | null
          sex?: string | null
          slug?: string | null
          something_else_coaches_know?: string | null
          source_sync_id?: string | null
          star_rating?: number | null
          star_rating_at_commit?: number | null
          status?: string | null
          status_expires_at?: string | null
          strengths?: string | null
          student_type?: string | null
          swing_coach?: string | null
          tac_adaptability?: number | null
          tac_anticipation?: number | null
          tac_decision_making?: number | null
          tac_mental_resilience?: number | null
          tech_backhand?: number | null
          tech_baseline?: number | null
          tech_forehand?: number | null
          tech_net?: number | null
          tech_serve?: number | null
          tech_smash?: number | null
          tech_volley?: number | null
          tennis_iq_comments?: string | null
          toefl?: string | null
          tournament_results_link?: string | null
          trackman_report_link?: string | null
          transfer_from_division?: string | null
          transfer_from_school?: string | null
          transfer_individual_ranking?: string | null
          updated_at?: string | null
          utr?: number | null
          utr_profile_link?: string | null
          video_links?: string | null
          wagr_ranking?: string | null
          weaknesses?: string | null
          weight_kg?: number | null
          why_good_recruit?: string | null
          wtn?: number | null
          wtn_profile_link?: string | null
        }
        Update: {
          academic_gpa?: number | null
          areas_of_improvement?: string | null
          backhand_type?: string | null
          best_recent_period?: string | null
          best_recent_period_raw?: string | null
          best_recent_scoring_avg?: string | null
          best_recent_scoring_avg_raw?: string | null
          best_results?: string | null
          city?: string | null
          club_team?: string | null
          commit_date?: string | null
          committed?: boolean | null
          committed_to?: string | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          date_of_birth?: never
          default_scoring_period_type?: string | null
          default_scoring_period_value?: string | null
          dominant_hand?: string | null
          drive_distance_carry?: string | null
          duolingo?: string | null
          eligibility_years?: number | null
          email?: never
          featured?: boolean | null
          first_name?: string | null
          french_adult_ranking?: string | null
          french_adult_ranking_at_commit?: string | null
          french_ranking_1yr_before_college?: string | null
          french_ranking_in_their_class?: string | null
          golf_club_team?: string | null
          golf_data_link?: string | null
          graduation_year?: string | null
          height_cm?: number | null
          high_school?: string | null
          high_school_year?: string | null
          id?: string | null
          importance_large_city?: string | null
          instagram_handle?: string | null
          intended_majors?: string | null
          itf_junior_ranking?: string | null
          last_name?: string | null
          max_club_head_speed?: number | null
          national_ranking?: string | null
          national_ranking_country?: string | null
          objectives?: string | null
          other_interests?: string | null
          phone?: never
          phys_endurance?: number | null
          phys_flexibility?: number | null
          phys_strength?: number | null
          play_style?: string | null
          preferences_budget?: string | null
          preferences_division?: string | null
          preferences_region?: string | null
          preferred_states?: string | null
          preferred_surface?: string | null
          profile_photo?: string | null
          recent_results?: string | null
          sat?: string | null
          scoreboard_current_rank?: string | null
          scoring_average?: string | null
          scoring_average_override?: boolean | null
          scoring_average_vs_course_rating?: string | null
          scoring_average_vs_par?: string | null
          scoring_avg_all_time_raw?: string | null
          scoring_avg_current_year_raw?: string | null
          scoring_avg_last_10_raw?: string | null
          scoring_avg_last_3_raw?: string | null
          scoring_avg_last_5_raw?: string | null
          scoring_avg_last_7?: string | null
          scoring_avg_last_7_raw?: string | null
          scoring_avg_vs_cr_current_year?: string | null
          scoring_avg_vs_cr_last_10?: string | null
          scoring_avg_vs_cr_last_3?: string | null
          scoring_avg_vs_cr_last_5?: string | null
          scoring_avg_vs_cr_last_7?: string | null
          scoring_avg_vs_cr_last_update?: string | null
          scoring_avg_vs_cr_override?: boolean | null
          scoring_avg_vs_par_all_time?: string | null
          scoring_avg_vs_par_current_year?: string | null
          scoring_avg_vs_par_last_10?: string | null
          scoring_avg_vs_par_last_3?: string | null
          scoring_avg_vs_par_last_5?: string | null
          scoring_avg_vs_par_last_7?: string | null
          seven_iron_distance_carry?: string | null
          sex?: string | null
          slug?: string | null
          something_else_coaches_know?: string | null
          source_sync_id?: string | null
          star_rating?: number | null
          star_rating_at_commit?: number | null
          status?: string | null
          status_expires_at?: string | null
          strengths?: string | null
          student_type?: string | null
          swing_coach?: string | null
          tac_adaptability?: number | null
          tac_anticipation?: number | null
          tac_decision_making?: number | null
          tac_mental_resilience?: number | null
          tech_backhand?: number | null
          tech_baseline?: number | null
          tech_forehand?: number | null
          tech_net?: number | null
          tech_serve?: number | null
          tech_smash?: number | null
          tech_volley?: number | null
          tennis_iq_comments?: string | null
          toefl?: string | null
          tournament_results_link?: string | null
          trackman_report_link?: string | null
          transfer_from_division?: string | null
          transfer_from_school?: string | null
          transfer_individual_ranking?: string | null
          updated_at?: string | null
          utr?: number | null
          utr_profile_link?: string | null
          video_links?: string | null
          wagr_ranking?: string | null
          weaknesses?: string | null
          weight_kg?: number | null
          why_good_recruit?: string | null
          wtn?: number | null
          wtn_profile_link?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_university: {
        Args: { p_university_id: string }
        Returns: undefined
      }
      admin_fetch_all_result_tournament_ids: { Args: never; Returns: string[] }
      admin_fetch_all_tournaments_for_dedup: {
        Args: never
        Returns: {
          category: string
          country: string
          course_par: string
          course_rating: string
          course_slope: string
          created_at: string
          end_date: string
          id: string
          location: string
          name: string
          series_name: string
          series_type: string
          sex: string
          start_date: string
          tournament_type: string
          yardage: string
          year: string
        }[]
      }
      admin_list_coaches: {
        Args: never
        Returns: {
          contact_count: number
          created_at: string
          division: string
          email: string
          favorites_count: number
          first_name: string
          full_name: string
          id: string
          last_name: string
          recruiting_needs: string
          school_name: string
          search_count: number
          status: string
          updated_at: string
        }[]
      }
      admin_list_universities: {
        Args: never
        Returns: {
          coach_count: number
          created_at: string
          division: string
          id: string
          name: string
          state: string
          verified: boolean
        }[]
      }
      admin_merge_universities: {
        Args: { p_keep_id: string; p_merge_id: string }
        Returns: undefined
      }
      admin_search_tournaments_needs_results: {
        Args: {
          p_country?: string
          p_date_from?: string
          p_date_to?: string
          p_gender?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort_dir?: string
          p_sort_key?: string
          p_type?: string
        }
        Returns: {
          rows: Json
          total_count: number
        }[]
      }
      admin_tournament_distinct_countries: { Args: never; Returns: string[] }
      admin_tournament_page_result_counts: {
        Args: { p_ids: string[] }
        Returns: {
          athlete_count: number
          result_count: number
          tournament_id: string
        }[]
      }
      admin_tournament_stats: { Args: never; Returns: Json }
      admin_update_university: {
        Args: {
          p_division?: string
          p_name?: string
          p_state?: string
          p_university_id: string
          p_verified?: boolean
        }
        Returns: undefined
      }
      athlete_scoring_by_year: {
        Args: { p_athlete_id: string }
        Returns: {
          n_rounds: number
          scoring_avg: number
          scoring_avg_vs_cr: number
          year: number
        }[]
      }
      auto_expire_athlete_status: { Args: never; Returns: undefined }
      calculate_athlete_metrics: {
        Args: { athlete_uuid: string; last_n?: number }
        Returns: {
          avg_score_vs_cr: number
          avg_score_vs_par: number
          best_finish: number
          top_10_finishes: number
          total_tournaments: number
        }[]
      }
      calculate_scoring_avg_dynamic: {
        Args: {
          athlete_uuid: string
          filter_type?: string
          filter_value?: string
        }
        Returns: number
      }
      calculate_scoring_avg_vs_cr: {
        Args: { athlete_uuid: string }
        Returns: number
      }
      calculate_scoring_avg_vs_cr_dynamic: {
        Args: {
          athlete_uuid: string
          filter_type?: string
          filter_value?: string
        }
        Returns: number
      }
      calculate_scoring_avg_vs_par_dynamic: {
        Args: {
          athlete_uuid: string
          filter_type?: string
          filter_value?: string
        }
        Returns: number
      }
      create_test_accounts_instructions: { Args: never; Returns: string }
      crm_resolve_agent: { Args: { raw: string }; Returns: string }
      crm_slugify_name: { Args: { p: string }; Returns: string }
      current_user_is_active: { Args: never; Returns: boolean }
      generate_athlete_slug: {
        Args: { athlete_id: string; first: string; last: string }
        Returns: string
      }
      get_current_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_athlete_simple: {
        Args: {
          p_academic_gpa: string
          p_areas_of_improvement: string
          p_committed: string
          p_committed_to: string
          p_country: string
          p_date_of_birth: string
          p_drive_distance_carry: string
          p_duolingo: string
          p_first_name: string
          p_french_adult_ranking: string
          p_french_ranking_in_their_class: string
          p_golf_club_team: string
          p_graduation_year: string
          p_importance_large_city: string
          p_intended_majors: string
          p_last_name: string
          p_max_club_head_speed: string
          p_other_interests: string
          p_preferences_budget: string
          p_preferences_division: string
          p_preferences_region: string
          p_profile_photo: string
          p_sat: string
          p_scoring_average: string
          p_scoring_average_vs_course_rating: string
          p_scoring_average_vs_par: string
          p_seven_iron_distance_carry: string
          p_sex: string
          p_something_else_coaches_know: string
          p_source_sync_id: string
          p_status: string
          p_strengths: string
          p_toefl: string
          p_video_links: string
          p_wagr_ranking: string
          p_why_good_recruit: string
        }
        Returns: string
      }
      list_featured_athletes: {
        Args: never
        Returns: {
          academic_gpa: number
          best_recent_scoring_avg_raw: string
          country: string
          first_name: string
          golf_club_team: string
          graduation_year: string
          id: string
          last_name: string
          profile_photo: string
          scoring_average: string
          star_rating: number
          status: string
        }[]
      }
      list_universities: {
        Args: never
        Returns: {
          division: string
          id: string
          name: string
          state: string
        }[]
      }
      tournament_visible_counts: {
        Args: { p_ids: string[] }
        Returns: {
          tournament_id: string
          visible_count: number
        }[]
      }
      update_athlete_statistics_cache: {
        Args: { p_athlete_id: string; p_metric_type?: string }
        Returns: undefined
      }
      upsert_athlete_from_pipe: {
        Args: {
          p_agent_raw: string
          p_player_name: string
          p_school?: string
          p_signing_season: string
          p_v1: number
          p_v2: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "agent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "agent"],
    },
  },
} as const
