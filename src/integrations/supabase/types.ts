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
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          appointment_id: string | null
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
        ]
      }
      clinical_notes: {
        Row: {
          assessment: string | null
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
            foreignKeyName: "clinical_notes_patient_id_fkey"
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
          code: string
          created_at: string
          default_fee: number
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          default_fee?: number
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          default_fee?: number
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          allowed_amount: number
          billed_amount: number
          claim_no: string
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
        Relationships: []
      }
      intake_forms: {
        Row: {
          address: string | null
          allergies: string[]
          booking_request_id: string | null
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
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          category: string
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
            foreignKeyName: "invoices_patient_id_fkey"
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
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
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
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recalls: {
        Row: {
          active: boolean
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
          created_at?: string
          default_provider?: string | null
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tooth_charts: {
        Row: {
          chart_date: string
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
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
      patient_sex: "F" | "M" | "Other"
      patient_status: "Active" | "Recall" | "Overdue" | "New"
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
      patient_sex: ["F", "M", "Other"],
      patient_status: ["Active", "Recall", "Overdue", "New"],
    },
  },
} as const
