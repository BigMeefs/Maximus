export type BusinessPlanStatus = "Not Started" | "In Progress" | "Complete";
export type ActionStatus = "Not Started" | "In Progress" | "Complete";

export const BUSINESS_STAGES = [
  "Idea",
  "Research",
  "Business Planning",
  "Financial Planning",
  "HMRC Registration",
  "Ready to Trade",
  "Trading",
  "Gateway Preparation",
  "Gateway Complete",
  "Gainful Assessment",
  "Gainful Decision",
] as const;
export type BusinessStage = (typeof BUSINESS_STAGES)[number];

export type RagStatus = "Green" | "Amber" | "Red";

export const FUNDING_APPLICATION_STATUSES = [
  "Draft",
  "Applied",
  "Approved",
  "Declined",
  "Received",
] as const;
export type FundingApplicationStatus = (typeof FUNDING_APPLICATION_STATUSES)[number];

export type BusinessStructure = "Sole Trader" | "Limited Company";

export const DIGITAL_PLATFORMS = [
  "Website",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "TikTok",
  "Google Business Profile",
  "YouTube",
  "Online Booking",
  "Google Reviews",
] as const;
export type DigitalPlatform = (typeof DIGITAL_PLATFORMS)[number];

export const GATEWAY_MANUAL_CHECKLIST_ITEMS = [
  "Market Research",
  "Competitor Analysis",
  "Pricing",
  "Cashflow Forecast",
  "Marketing Plan",
  "Branding",
  "Social Media",
  "Invoices Available",
] as const;
export type GatewayChecklistItemName = (typeof GATEWAY_MANUAL_CHECKLIST_ITEMS)[number];

export type GainfulRecommendation =
  | "Ready"
  | "Needs Further Evidence"
  | "Not Yet Ready";

export type ImportStatus = "Success" | "Partial" | "Failed";

export const EVIDENCE_CATEGORIES = [
  "Business Plan",
  "Cashflow",
  "Invoices",
  "Receipts",
  "Quotes",
  "Bank Statements",
  "Insurance",
  "Certificates",
  "Marketing Material",
  "Photos",
  "Other",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export type Participant = {
  id: string;
  advisor_name: string;
  ptp_name: string;
  business_name: string;
  previous_advisor: string | null;
  scheme_start_date: string;
  website: string | null;
  social_media_links: string | null;
  created_at: string;
  updated_at: string;
  business_sector: string | null;
  business_stage: BusinessStage;
  business_stage_updated_at: string;
  rag_status: RagStatus;
  rag_note: string | null;
  gateway_target_date: string | null;
  health_confidence: number | null;
  external_participant_id: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  national_insurance_number: string | null;
};

export type BusinessPlan = {
  id: string;
  participant_id: string;
  status: BusinessPlanStatus;
  file_path: string | null;
  file_name: string | null;
  updated_at: string;
};

export type MonthlyEarning = {
  id: string;
  participant_id: string;
  month: string;
  amount: number;
  expenses: number;
  hours_worked: number | null;
  customer_count: number | null;
  largest_customer: string | null;
  notes: string | null;
  created_at: string;
};

export type EvidenceFile = {
  id: string;
  participant_id: string;
  file_path: string;
  file_name: string;
  category: EvidenceCategory;
  uploaded_at: string;
};

export type ActionPlanItem = {
  id: string;
  participant_id: string;
  description: string;
  status: ActionStatus;
  target_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type Appointment = {
  id: string;
  participant_id: string;
  appointment_date: string;
  advisor_name: string;
  notes: string | null;
  outcome: string | null;
  created_at: string;
};

export type FundingRecord = {
  id: string;
  participant_id: string;
  funding_source: string;
  amount_requested: number | null;
  amount_approved: number | null;
  amount_received: number | null;
  funding_purpose: string | null;
  application_status: FundingApplicationStatus;
  application_date: string | null;
  decision_date: string | null;
  file_path: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HmrcBusinessInfo = {
  id: string;
  participant_id: string;
  business_structure: BusinessStructure | null;
  utr_number: string | null;
  hmrc_registration_date: string | null;
  vat_registered: boolean;
  paye_registered: boolean;
  business_bank_account: boolean;
  insurance_status: string | null;
  accountant_name: string | null;
  accountant_contact: string | null;
  tax_deadline_notes: string | null;
  updated_at: string;
};

export type DigitalPresenceItem = {
  id: string;
  participant_id: string;
  platform: DigitalPlatform;
  is_active: boolean;
  url: string | null;
  notes: string | null;
  updated_at: string;
};

export type GatewayChecklistItem = {
  id: string;
  participant_id: string;
  item: GatewayChecklistItemName;
  is_complete: boolean;
  updated_at: string;
};

export type GainfulAssessment = {
  id: string;
  participant_id: string;
  trading_consistently: boolean;
  hours_worked_adequate: boolean;
  bank_statements_provided: boolean;
  customer_base_established: boolean;
  business_sustainable: boolean;
  advisor_recommendation: string | null;
  manager_approval: boolean;
  manager_notes: string | null;
  overall_recommendation: GainfulRecommendation;
  updated_at: string;
};

export type ImportFieldMapping = {
  id: string;
  source_column: string;
  target_field: string;
  updated_at: string;
};

export type ImportBatch = {
  id: string;
  imported_by: string;
  file_name: string;
  source: string;
  row_count: number;
  created_count: number;
  updated_count: number;
  duplicate_count: number;
  error_count: number;
  skipped_count: number;
  status: ImportStatus;
  notes: string | null;
  created_at: string;
};

export type ImportError = {
  id: string;
  import_batch_id: string;
  row_number: number;
  error_message: string;
  row_data: Record<string, unknown> | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: Participant;
        Insert: Partial<Participant> & {
          advisor_name: string;
          ptp_name: string;
          business_name: string;
          scheme_start_date: string;
        };
        Update: Partial<Participant>;
        Relationships: [];
      };
      business_plans: {
        Row: BusinessPlan;
        Insert: Partial<BusinessPlan> & { participant_id: string };
        Update: Partial<BusinessPlan>;
        Relationships: [];
      };
      monthly_earnings: {
        Row: MonthlyEarning;
        Insert: Partial<MonthlyEarning> & {
          participant_id: string;
          month: string;
          amount: number;
        };
        Update: Partial<MonthlyEarning>;
        Relationships: [];
      };
      evidence_files: {
        Row: EvidenceFile;
        Insert: Partial<EvidenceFile> & {
          participant_id: string;
          file_path: string;
          file_name: string;
        };
        Update: Partial<EvidenceFile>;
        Relationships: [];
      };
      action_plan_items: {
        Row: ActionPlanItem;
        Insert: Partial<ActionPlanItem> & {
          participant_id: string;
          description: string;
        };
        Update: Partial<ActionPlanItem>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Appointment> & {
          participant_id: string;
          appointment_date: string;
          advisor_name: string;
        };
        Update: Partial<Appointment>;
        Relationships: [];
      };
      funding_records: {
        Row: FundingRecord;
        Insert: Partial<FundingRecord> & {
          participant_id: string;
          funding_source: string;
        };
        Update: Partial<FundingRecord>;
        Relationships: [];
      };
      hmrc_business_info: {
        Row: HmrcBusinessInfo;
        Insert: Partial<HmrcBusinessInfo> & { participant_id: string };
        Update: Partial<HmrcBusinessInfo>;
        Relationships: [];
      };
      digital_presence_items: {
        Row: DigitalPresenceItem;
        Insert: Partial<DigitalPresenceItem> & {
          participant_id: string;
          platform: DigitalPlatform;
        };
        Update: Partial<DigitalPresenceItem>;
        Relationships: [];
      };
      gateway_checklist_items: {
        Row: GatewayChecklistItem;
        Insert: Partial<GatewayChecklistItem> & {
          participant_id: string;
          item: GatewayChecklistItemName;
        };
        Update: Partial<GatewayChecklistItem>;
        Relationships: [];
      };
      gainful_assessments: {
        Row: GainfulAssessment;
        Insert: Partial<GainfulAssessment> & { participant_id: string };
        Update: Partial<GainfulAssessment>;
        Relationships: [];
      };
      import_field_mappings: {
        Row: ImportFieldMapping;
        Insert: Partial<ImportFieldMapping> & {
          source_column: string;
          target_field: string;
        };
        Update: Partial<ImportFieldMapping>;
        Relationships: [];
      };
      import_batches: {
        Row: ImportBatch;
        Insert: Partial<ImportBatch> & {
          imported_by: string;
          file_name: string;
        };
        Update: Partial<ImportBatch>;
        Relationships: [];
      };
      import_errors: {
        Row: ImportError;
        Insert: Partial<ImportError> & {
          import_batch_id: string;
          row_number: number;
          error_message: string;
        };
        Update: Partial<ImportError>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
