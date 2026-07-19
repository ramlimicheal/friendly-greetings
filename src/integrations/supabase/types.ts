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
      appointments: {
        Row: {
          chair: number
          clinic_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          notes: string | null
          patient_id: string
          procedure: string
          provider: string
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          chair: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          duration_min: number
          id?: string
          notes?: string | null
          patient_id: string
          procedure: string
          provider: string
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          chair?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id?: string
          procedure?: string
          provider?: string
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          clinic_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          clinic_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          handled_at: string | null
          handled_by: string | null
          id: string
          is_new_patient: boolean
          notes: string | null
          patient_id: string | null
          phone: string
          preferred_date: string
          preferred_provider: string | null
          preferred_time: string
          reason: string | null
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          is_new_patient?: boolean
          notes?: string | null
          patient_id?: string | null
          phone: string
          preferred_date: string
          preferred_provider?: string | null
          preferred_time: string
          reason?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          is_new_patient?: boolean
          notes?: string | null
          patient_id?: string | null
          phone?: string
          preferred_date?: string
          preferred_provider?: string | null
          preferred_time?: string
          reason?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_items: {
        Row: {
          claim_id: string
          clinic_id: string
          created_at: string
          description: string
          fee: number
          id: string
          procedure_code: string
          service_date: string | null
          sort_order: number
          surfaces: string | null
          tooth_number: number | null
          updated_at: string
        }
        Insert: {
          claim_id: string
          clinic_id?: string
          created_at?: string
          description: string
          fee?: number
          id?: string
          procedure_code: string
          service_date?: string | null
          sort_order?: number
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Update: {
          claim_id?: string
          clinic_id?: string
          created_at?: string
          description?: string
          fee?: number
          id?: string
          procedure_code?: string
          service_date?: string | null
          sort_order?: number
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["clinic_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          clinic_id: string
          created_at: string
          email_enabled: boolean
          email_from_address: string | null
          email_from_name: string | null
          reminder_email_body: string
          reminder_email_subject: string
          reminder_hours_before: number
          reminder_sms_template: string
          sms_enabled: boolean
          sms_from: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email_enabled?: boolean
          email_from_address?: string | null
          email_from_name?: string | null
          reminder_email_body?: string
          reminder_email_subject?: string
          reminder_hours_before?: number
          reminder_sms_template?: string
          sms_enabled?: boolean
          sms_from?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email_enabled?: boolean
          email_from_address?: string | null
          email_from_name?: string | null
          reminder_email_body?: string
          reminder_email_subject?: string
          reminder_hours_before?: number
          reminder_sms_template?: string
          sms_enabled?: boolean
          sms_from?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          assessment: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          objective: string | null
          patient_id: string
          plan: string | null
          provider: string | null
          signed_at: string | null
          signed_by: string | null
          subjective: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          assessment?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          objective?: string | null
          patient_id: string
          plan?: string | null
          provider?: string | null
          signed_at?: string | null
          signed_by?: string | null
          subjective?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          assessment?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          objective?: string | null
          patient_id?: string
          plan?: string | null
          provider?: string | null
          signed_at?: string | null
          signed_by?: string | null
          subjective?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          chair_count: number
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          slug: string | null
          state: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          chair_count?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          chair_count?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          appointment_id: string | null
          body: string
          channel: string
          clinic_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          patient_id: string | null
          provider_ref: string | null
          purpose: string
          sent_by: string | null
          status: string
          subject: string | null
          to_address: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          channel: string
          clinic_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          patient_id?: string | null
          provider_ref?: string | null
          purpose?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          to_address: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          channel?: string
          clinic_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          patient_id?: string | null
          provider_ref?: string | null
          purpose?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          to_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_schedule: {
        Row: {
          category: string
          clinic_id: string
          code: string
          created_at: string
          default_fee: number
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          category?: string
          clinic_id?: string
          code: string
          created_at?: string
          default_fee?: number
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          code?: string
          created_at?: string
          default_fee?: number
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedule_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          allowed_amount: number
          billed_amount: number
          claim_no: string
          clinic_id: string
          created_at: string
          created_by: string | null
          diagnosis: string | null
          id: string
          invoice_id: string | null
          narrative: string | null
          paid_amount: number
          paid_at: string | null
          patient_id: string
          plan_id: string | null
          provider: string | null
          service_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          allowed_amount?: number
          billed_amount?: number
          claim_no: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          invoice_id?: string | null
          narrative?: string | null
          paid_amount?: number
          paid_at?: string | null
          patient_id: string
          plan_id?: string | null
          provider?: string | null
          service_date?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          allowed_amount?: number
          billed_amount?: number
          claim_no?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          invoice_id?: string | null
          narrative?: string | null
          paid_amount?: number
          paid_at?: string | null
          patient_id?: string
          plan_id?: string | null
          provider?: string | null
          service_date?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          active: boolean
          annual_maximum: number
          basic_pct: number
          clinic_id: string
          created_at: string
          deductible: number
          group_number: string | null
          id: string
          major_pct: number
          notes: string | null
          ortho_pct: number
          payer_name: string
          plan_name: string | null
          preventive_pct: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_maximum?: number
          basic_pct?: number
          clinic_id?: string
          created_at?: string
          deductible?: number
          group_number?: string | null
          id?: string
          major_pct?: number
          notes?: string | null
          ortho_pct?: number
          payer_name: string
          plan_name?: string | null
          preventive_pct?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_maximum?: number
          basic_pct?: number
          clinic_id?: string
          created_at?: string
          deductible?: number
          group_number?: string | null
          id?: string
          major_pct?: number
          notes?: string | null
          ortho_pct?: number
          payer_name?: string
          plan_name?: string | null
          preventive_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_forms: {
        Row: {
          address: string | null
          allergies: string[]
          booking_request_id: string | null
          clinic_id: string
          consent_privacy: boolean
          consent_treatment: boolean
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          insurance_carrier: string | null
          insurance_group: string | null
          insurance_member_id: string | null
          medical_conditions: string[]
          medications: string[]
          patient_id: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[]
          booking_request_id?: string | null
          clinic_id?: string
          consent_privacy?: boolean
          consent_treatment?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          insurance_carrier?: string | null
          insurance_group?: string | null
          insurance_member_id?: string | null
          medical_conditions?: string[]
          medications?: string[]
          patient_id?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[]
          booking_request_id?: string | null
          clinic_id?: string
          consent_privacy?: boolean
          consent_treatment?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          insurance_carrier?: string | null
          insurance_group?: string | null
          insurance_member_id?: string | null
          medical_conditions?: string[]
          medications?: string[]
          patient_id?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_forms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_forms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          description: string
          fee: number
          id: string
          insurance_estimate: number
          invoice_id: string
          patient_portion: number
          procedure_code: string
          sort_order: number
          surfaces: string | null
          tooth_number: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          clinic_id?: string
          created_at?: string
          description: string
          fee?: number
          id?: string
          insurance_estimate?: number
          invoice_id: string
          patient_portion?: number
          procedure_code: string
          sort_order?: number
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          description?: string
          fee?: number
          id?: string
          insurance_estimate?: number
          invoice_id?: string
          patient_portion?: number
          procedure_code?: string
          sort_order?: number
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          clinic_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          insurance_estimate: number
          invoice_no: string
          issue_date: string
          notes: string | null
          patient_id: string
          patient_portion: number
          status: string
          subtotal: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          insurance_estimate?: number
          invoice_no: string
          issue_date?: string
          notes?: string | null
          patient_id: string
          patient_portion?: number
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          insurance_estimate?: number
          invoice_no?: string
          issue_date?: string
          notes?: string | null
          patient_id?: string
          patient_portion?: number
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_files: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          patient_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          clinic_id?: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          patient_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          patient_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_insurance: {
        Row: {
          benefits_used: number
          clinic_id: string
          created_at: string
          effective_date: string | null
          id: string
          is_primary: boolean
          member_id: string | null
          patient_id: string
          plan_id: string
          relationship: string
          subscriber_name: string | null
          updated_at: string
        }
        Insert: {
          benefits_used?: number
          clinic_id?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          is_primary?: boolean
          member_id?: string | null
          patient_id: string
          plan_id: string
          relationship?: string
          subscriber_name?: string | null
          updated_at?: string
        }
        Update: {
          benefits_used?: number
          clinic_id?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          is_primary?: boolean
          member_id?: string | null
          patient_id?: string
          plan_id?: string
          relationship?: string
          subscriber_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_insurance_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurance_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurance_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[]
          balance: number
          chart_no: string
          clinic_id: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          insurance: string | null
          last_visit_at: string | null
          medical_conditions: string[]
          medications: string[]
          next_visit_at: string | null
          notes: string | null
          phone: string | null
          primary_dentist: string | null
          sex: Database["public"]["Enums"]["patient_sex"] | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[]
          balance?: number
          chart_no: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          insurance?: string | null
          last_visit_at?: string | null
          medical_conditions?: string[]
          medications?: string[]
          next_visit_at?: string | null
          notes?: string | null
          phone?: string | null
          primary_dentist?: string | null
          sex?: Database["public"]["Enums"]["patient_sex"] | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[]
          balance?: number
          chart_no?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          insurance?: string | null
          last_visit_at?: string | null
          medical_conditions?: string[]
          medications?: string[]
          next_visit_at?: string | null
          notes?: string | null
          phone?: string | null
          primary_dentist?: string | null
          sex?: Database["public"]["Enums"]["patient_sex"] | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          patient_id: string
          received_on: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          patient_id: string
          received_on?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          patient_id?: string
          received_on?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_clinic_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          platform_role: Database["public"]["Enums"]["platform_role"] | null
          updated_at: string
        }
        Insert: {
          active_clinic_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          updated_at?: string
        }
        Update: {
          active_clinic_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_clinic_id_fkey"
            columns: ["active_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      recalls: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          id: string
          interval_months: number
          last_completed_at: string | null
          next_due_at: string
          notes: string | null
          patient_id: string
          procedure: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          interval_months?: number
          last_completed_at?: string | null
          next_due_at: string
          notes?: string | null
          patient_id: string
          procedure?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          interval_months?: number
          last_completed_at?: string | null
          next_due_at?: string
          notes?: string | null
          patient_id?: string
          procedure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recalls_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          default_provider: string | null
          description: string | null
          duration_min: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          default_provider?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          default_provider?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_charts: {
        Row: {
          chart_date: string
          clinic_id: string
          created_at: string
          dentition: string
          id: string
          notes: string | null
          patient_id: string
          surface_buccal: string
          surface_distal: string
          surface_lingual: string
          surface_mesial: string
          surface_occlusal: string
          tooth_condition: string
          tooth_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chart_date?: string
          clinic_id?: string
          created_at?: string
          dentition?: string
          id?: string
          notes?: string | null
          patient_id: string
          surface_buccal?: string
          surface_distal?: string
          surface_lingual?: string
          surface_mesial?: string
          surface_occlusal?: string
          tooth_condition?: string
          tooth_number: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chart_date?: string
          clinic_id?: string
          created_at?: string
          dentition?: string
          id?: string
          notes?: string | null
          patient_id?: string
          surface_buccal?: string
          surface_distal?: string
          surface_lingual?: string
          surface_mesial?: string
          surface_occlusal?: string
          tooth_condition?: string
          tooth_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooth_charts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_charts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_items: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_at: string
          description: string
          fee: number
          id: string
          phase: number
          plan_id: string
          procedure_code: string
          sort_order: number
          status: string
          surfaces: string | null
          tooth_number: number | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          description: string
          fee?: number
          id?: string
          phase?: number
          plan_id: string
          procedure_code: string
          sort_order?: number
          status?: string
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          fee?: number
          id?: string
          phase?: number
          plan_id?: string
          procedure_code?: string
          sort_order?: number
          status?: string
          surfaces?: string | null
          tooth_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          patient_id: string
          presented_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          presented_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          presented_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          notes: string | null
          patient_id: string
          preferred_chair: number | null
          preferred_provider: string | null
          priority: number
          procedure: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id: string
          preferred_chair?: number | null
          preferred_provider?: string | null
          priority?: number
          procedure: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id?: string
          preferred_chair?: number | null
          preferred_provider?: string | null
          priority?: number
          procedure?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_current_clinic: { Args: never; Returns: boolean }
      check_appointment_conflict: {
        Args: {
          _chair: number
          _duration_min: number
          _exclude_id?: string
          _provider: string
          _start_at: string
        }
        Returns: {
          chair: number
          conflict_type: string
          duration_min: number
          id: string
          patient_id: string
          provider: string
          start_at: string
        }[]
      }
      current_clinic_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_clinic_role: {
        Args: {
          _clinic_id: string
          _roles: Database["public"]["Enums"]["clinic_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "dentist" | "hygienist" | "front_desk"
      appointment_status:
        | "unconfirmed"
        | "confirmed"
        | "arrived"
        | "in-chair"
        | "completed"
        | "cancelled"
        | "no-show"
      clinic_role:
        | "owner"
        | "admin"
        | "dentist"
        | "hygienist"
        | "assistant"
        | "front_desk"
        | "billing_specialist"
        | "read_only_auditor"
      patient_sex: "F" | "M" | "Other"
      patient_status: "Active" | "Recall" | "Overdue" | "New"
      platform_role: "super_admin" | "support_agent"
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
      app_role: ["admin", "dentist", "hygienist", "front_desk"],
      appointment_status: [
        "unconfirmed",
        "confirmed",
        "arrived",
        "in-chair",
        "completed",
        "cancelled",
        "no-show",
      ],
      clinic_role: [
        "owner",
        "admin",
        "dentist",
        "hygienist",
        "assistant",
        "front_desk",
        "billing_specialist",
        "read_only_auditor",
      ],
      patient_sex: ["F", "M", "Other"],
      patient_status: ["Active", "Recall", "Overdue", "New"],
      platform_role: ["super_admin", "support_agent"],
    },
  },
} as const
