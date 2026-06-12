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
      admin_audit_log: {
        Row: {
          action: string
          actor_role: string | null
          admin_user_id: string | null
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json
          request_id: string | null
          source: string | null
          success: boolean
          target_resource: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          admin_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          request_id?: string | null
          source?: string | null
          success?: boolean
          target_resource?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          admin_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          request_id?: string | null
          source?: string | null
          success?: boolean
          target_resource?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      app_error_reports: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          details: Json
          fingerprint: string
          id: string
          last_seen_at: string
          message: string
          occurrences: number
          platform: string | null
          route: string | null
          severity: string
          stack: string | null
          status: string
          title: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category?: string
          created_at?: string
          details?: Json
          fingerprint: string
          id?: string
          last_seen_at?: string
          message: string
          occurrences?: number
          platform?: string | null
          route?: string | null
          severity?: string
          stack?: string | null
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          details?: Json
          fingerprint?: string
          id?: string
          last_seen_at?: string
          message?: string
          occurrences?: number
          platform?: string | null
          route?: string | null
          severity?: string
          stack?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          changelog: string | null
          created_at: string
          force_update: boolean
          id: string
          platform: string
          store_url: string | null
          version: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          force_update?: boolean
          id?: string
          platform?: string
          store_url?: string | null
          version: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          force_update?: boolean
          id?: string
          platform?: string
          store_url?: string | null
          version?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_by: string
          created_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_by: string
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_by?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          answered_at: string | null
          call_type: string
          caller_id: string
          conversation_id: string
          created_at: string | null
          declined_at: string | null
          ended_at: string | null
          id: string
          is_read: boolean
          missed_at: string | null
          receiver_id: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          call_type?: string
          caller_id: string
          conversation_id: string
          created_at?: string | null
          declined_at?: string | null
          ended_at?: string | null
          id?: string
          is_read?: boolean
          missed_at?: string | null
          receiver_id: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          call_type?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string | null
          declined_at?: string | null
          ended_at?: string | null
          id?: string
          is_read?: boolean
          missed_at?: string | null
          receiver_id?: string
          status?: string
        }
        Relationships: []
      }
      chat_invitations: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          invited_by: string
          invited_user_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_invitations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clemio_ki_usage: {
        Row: {
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_aliases: {
        Row: {
          contact_user_id: string
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_autoplay: {
        Row: {
          auto_play: boolean
          contact_user_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          auto_play?: boolean
          contact_user_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          auto_play?: boolean
          contact_user_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          category: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_voice_profiles: {
        Row: {
          contact_user_id: string
          created_at: string | null
          elevenlabs_voice_id: string
          id: string
          sample_url: string | null
          user_id: string
          voice_name: string | null
        }
        Insert: {
          contact_user_id: string
          created_at?: string | null
          elevenlabs_voice_id: string
          id?: string
          sample_url?: string | null
          user_id: string
          voice_name?: string | null
        }
        Update: {
          contact_user_id?: string
          created_at?: string | null
          elevenlabs_voice_id?: string
          id?: string
          sample_url?: string | null
          user_id?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          id: string
          is_archived: boolean
          is_group: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_group?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_group?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      focus_contacts: {
        Row: {
          contact_user_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      internal_secrets: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_duration_seconds: number | null
          audio_transcript: string | null
          audio_transcript_created_at: string | null
          audio_transcript_language: string | null
          audio_transcript_provider: string | null
          audio_transcript_status: string
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_edited: boolean
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_transcript?: string | null
          audio_transcript_created_at?: string | null
          audio_transcript_language?: string | null
          audio_transcript_provider?: string | null
          audio_transcript_status?: string
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_edited?: boolean
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_transcript?: string | null
          audio_transcript_created_at?: string | null
          audio_transcript_language?: string | null
          audio_transcript_provider?: string | null
          audio_transcript_status?: string
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_trial_claims: {
        Row: {
          created_at: string
          id: string
          phone_trial_key: string
          trial_ends_at: string
          trial_started_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone_trial_key: string
          trial_ends_at: string
          trial_started_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone_trial_key?: string
          trial_ends_at?: string
          trial_started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      premium_whitelist: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_number: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          phone_normalized: string | null
          phone_number: string
          push_preview_enabled: boolean
          security_email: string | null
          updated_at: string | null
          voice_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          phone_normalized?: string | null
          phone_number: string
          push_preview_enabled?: boolean
          security_email?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          phone_normalized?: string | null
          phone_number?: string
          push_preview_enabled?: boolean
          security_email?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      report_notification_log: {
        Row: {
          id: string
          notified_at: string
          reported_user_id: string | null
          reporter_id: string
        }
        Insert: {
          id?: string
          notified_at?: string
          reported_user_id?: string | null
          reporter_id: string
        }
        Update: {
          id?: string
          notified_at?: string
          reported_user_id?: string | null
          reporter_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          id: string
          message_id: string | null
          reason: string
          report_type: string
          reported_by: string
          reported_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          report_type?: string
          reported_by: string
          reported_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          report_type?: string
          reported_by?: string
          reported_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_webhook_events: {
        Row: {
          app_user_id: string | null
          created_at: string
          entitlement_id: string | null
          environment: string | null
          error: string | null
          event_type: string | null
          id: string
          normalized: Json | null
          payload: Json | null
          processed_at: string | null
          product_id: string | null
          provider: string
          revenuecat_event_id: string | null
        }
        Insert: {
          app_user_id?: string | null
          created_at?: string
          entitlement_id?: string | null
          environment?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          normalized?: Json | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          provider: string
          revenuecat_event_id?: string | null
        }
        Update: {
          app_user_id?: string | null
          created_at?: string
          entitlement_id?: string | null
          environment?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          normalized?: Json | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          provider?: string
          revenuecat_event_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string | null
          current_period_end: string | null
          has_used_premium_trial: boolean
          iap_environment: string | null
          iap_last_event_at: string | null
          iap_original_transaction_id: string | null
          iap_product_id: string | null
          iap_provider: string | null
          iap_revenuecat_app_user_id: string | null
          iap_will_renew: boolean
          id: string
          is_founding_user: boolean
          last_payment_failed_at: string | null
          plan: string
          premium_current_period_end: string | null
          premium_plan: string | null
          premium_status: string
          premium_trial_ends_at: string | null
          premium_trial_started_at: string | null
          premium_until: string | null
          subscription_provider: string | null
          subscription_status: string | null
          trial_end: string | null
          trial_start: string | null
          trial_used: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          current_period_end?: string | null
          has_used_premium_trial?: boolean
          iap_environment?: string | null
          iap_last_event_at?: string | null
          iap_original_transaction_id?: string | null
          iap_product_id?: string | null
          iap_provider?: string | null
          iap_revenuecat_app_user_id?: string | null
          iap_will_renew?: boolean
          id?: string
          is_founding_user?: boolean
          last_payment_failed_at?: string | null
          plan?: string
          premium_current_period_end?: string | null
          premium_plan?: string | null
          premium_status?: string
          premium_trial_ends_at?: string | null
          premium_trial_started_at?: string | null
          premium_until?: string | null
          subscription_provider?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          trial_used?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          current_period_end?: string | null
          has_used_premium_trial?: boolean
          iap_environment?: string | null
          iap_last_event_at?: string | null
          iap_original_transaction_id?: string | null
          iap_product_id?: string | null
          iap_provider?: string | null
          iap_revenuecat_app_user_id?: string | null
          iap_will_renew?: boolean
          id?: string
          is_founding_user?: boolean
          last_payment_failed_at?: string | null
          plan?: string
          premium_current_period_end?: string | null
          premium_plan?: string | null
          premium_status?: string
          premium_trial_ends_at?: string | null
          premium_trial_started_at?: string | null
          premium_until?: string | null
          subscription_provider?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          trial_used?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ki_improve: number
          period_start: string
          storage_bytes: number
          stt_seconds: number
          translate: number
          tts_seconds: number
          updated_at: string
          user_id: string
          voice_listen: number
          voice_retrain: number
        }
        Insert: {
          ki_improve?: number
          period_start: string
          storage_bytes?: number
          stt_seconds?: number
          translate?: number
          tts_seconds?: number
          updated_at?: string
          user_id: string
          voice_listen?: number
          voice_retrain?: number
        }
        Update: {
          ki_improve?: number
          period_start?: string
          storage_bytes?: number
          stt_seconds?: number
          translate?: number
          tts_seconds?: number
          updated_at?: string
          user_id?: string
          voice_listen?: number
          voice_retrain?: number
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          active_voice: number
          ki_improve: number
          plan: string
          storage_mb: number
          stt_minutes: number
          translate: number
          tts_minutes: number
          updated_at: string
          voice_listen: number
          voice_retrain: number
        }
        Insert: {
          active_voice?: number
          ki_improve?: number
          plan: string
          storage_mb?: number
          stt_minutes?: number
          translate?: number
          tts_minutes?: number
          updated_at?: string
          voice_listen?: number
          voice_retrain?: number
        }
        Update: {
          active_voice?: number
          ki_improve?: number
          plan?: string
          storage_mb?: number
          stt_minutes?: number
          translate?: number
          tts_minutes?: number
          updated_at?: string
          voice_listen?: number
          voice_retrain?: number
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_consents: {
        Row: {
          created_at: string | null
          granted_to_user_id: string
          id: string
          push_sent: boolean
          status: string
          updated_at: string | null
          voice_owner_id: string
        }
        Insert: {
          created_at?: string | null
          granted_to_user_id: string
          id?: string
          push_sent?: boolean
          status?: string
          updated_at?: string | null
          voice_owner_id: string
        }
        Update: {
          created_at?: string | null
          granted_to_user_id?: string
          id?: string
          push_sent?: boolean
          status?: string
          updated_at?: string | null
          voice_owner_id?: string
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          created_at: string | null
          elevenlabs_voice_id: string
          id: string
          sample_url: string | null
          user_id: string
          voice_name: string | null
        }
        Insert: {
          created_at?: string | null
          elevenlabs_voice_id: string
          id?: string
          sample_url?: string | null
          user_id: string
          voice_name?: string | null
        }
        Update: {
          created_at?: string | null
          elevenlabs_voice_id?: string
          id?: string
          sample_url?: string | null
          user_id?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      voice_request_log: {
        Row: {
          created_at: string
          id: string
          outcome: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      voice_secrets: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          voice_encryption_key: string | null
          voice_path: string | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          voice_encryption_key?: string | null
          voice_path?: string | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          voice_encryption_key?: string | null
          voice_path?: string | null
        }
        Relationships: []
      }
      web_vitals_samples: {
        Row: {
          created_at: string
          device: string | null
          id: string
          metric: string
          navigation_type: string | null
          rating: string | null
          route: string
          value: number
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          metric: string
          navigation_type?: string | null
          rating?: string | null
          route: string
          value: number
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          metric?: string
          navigation_type?: string | null
          rating?: string | null
          route?: string
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _compute_phone_trial_key: {
        Args: { _phone_normalized: string }
        Returns: string
      }
      accept_message_request: {
        Args: { _invitation_id: string }
        Returns: string
      }
      admin_list_user_usage: {
        Args: {
          _limit?: number
          _offset?: number
          _over_limit_only?: boolean
          _plan?: string
          _search?: string
        }
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          effective_plan: string
          limits: Json
          pct_max: number
          plan: string
          premium_until: string
          subscription_provider: string
          subscription_status: string
          total_count: number
          trial_end: string
          trial_used: boolean
          used: Json
          user_id: string
          user_name: string
          user_phone: string
        }[]
      }
      admin_plan_overview: { Args: never; Returns: Json }
      anonymize_trial_claim_for_user: {
        Args: { _user_id: string }
        Returns: undefined
      }
      audit_request_context: { Args: never; Returns: Json }
      block_message_request: {
        Args: { _invitation_id: string; _reason?: string }
        Returns: undefined
      }
      check_and_consume_quota: {
        Args: { _amount?: number; _metric: string; _user_id: string }
        Returns: Json
      }
      create_direct_chat: { Args: { _target_user_id: string }; Returns: string }
      decline_message_request: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_current_profile: {
        Args: { profile_display_name?: string; profile_phone_number?: string }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          phone_normalized: string | null
          phone_number: string
          push_preview_enabled: boolean
          security_email: string | null
          updated_at: string | null
          voice_enabled: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_accessible_profiles: {
        Args: { target_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      get_accessible_voice_profile_states: {
        Args: { target_ids: string[] }
        Returns: {
          has_voice: boolean
          user_id: string
        }[]
      }
      get_blocked_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          first_name: string
          user_id: string
        }[]
      }
      get_message_request_preview: {
        Args: { _invitation_id: string }
        Returns: Json
      }
      get_premium_status: { Args: never; Returns: Json }
      get_user_security_email: { Args: { _user_id: string }; Returns: string }
      get_user_usage_summary: { Args: { _user_id?: string }; Returns: Json }
      get_web_vitals_summary: {
        Args: { _days?: number }
        Returns: {
          delta_pct: number
          good_pct: number
          metric: string
          p75_current: number
          p75_previous: number
          route: string
          sample_count_current: number
          sample_count_previous: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      list_app_error_reports: {
        Args: {
          _category?: string
          _from?: string
          _limit?: number
          _offset?: number
          _route?: string
          _search?: string
          _severity?: string
          _source?: string
          _status?: string
          _to?: string
        }
        Returns: {
          admin_note: string
          category: string
          created_at: string
          details: Json
          fingerprint: string
          id: string
          last_seen_at: string
          message: string
          occurrences: number
          platform: string
          route: string
          severity: string
          stack: string
          status: string
          title: string
          total_count: number
          updated_at: string
          user_agent: string
          user_id: string
          user_name: string
          user_phone: string
        }[]
      }
      list_user_activity: {
        Args: {
          _event_type?: string
          _from?: string
          _limit?: number
          _offset?: number
          _search?: string
          _to?: string
        }
        Returns: {
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json
          total_count: number
          user_avatar: string
          user_id: string
          user_name: string
          user_phone: string
        }[]
      }
      log_app_error_report: {
        Args: {
          _category?: string
          _dedupe_window_seconds?: number
          _details?: Json
          _fingerprint?: string
          _message: string
          _platform?: string
          _route?: string
          _severity?: string
          _stack?: string
          _title: string
          _user_agent?: string
        }
        Returns: string
      }
      log_security_event:
        | {
            Args: {
              _action: string
              _metadata: Json
              _target_resource: string
              _target_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _action: string
              _metadata?: Json
              _source?: string
              _target_resource: string
              _target_user_id: string
            }
            Returns: undefined
          }
      mark_messages_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      match_contacts_by_phone: {
        Args: { _phones: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_contact_phone: { Args: { _phone: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_voice_consent: {
        Args: { _voice_owner_id: string }
        Returns: Json
      }
      search_profiles_by_query: {
        Args: { search_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      start_premium_trial: { Args: never; Returns: Json }
      submit_contact_form: {
        Args: {
          _category: string
          _email: string
          _ip_address?: string
          _message: string
          _name: string
        }
        Returns: string
      }
      user_activity_display_name: {
        Args: { _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
