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
  "Gainful Decision",
] as const;
export type BusinessStage = (typeof BUSINESS_STAGES)[number];

export type RagStatus = "Green" | "Amber" | "Red";

export const PARTICIPANT_STATUSES = [
  "Referral",
  "Active",
  "Trading Start",
  "In Work Tracking",
  "Outcome Achieved",
  "Closed",
] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const TRADING_START_REASONS = [
  "GSE",
  "NGSE",
  "Claim Closed Whilst Self Employed",
] as const;
export type TradingStartReason = (typeof TRADING_START_REASONS)[number];

export const FUNDING_APPLICATION_STATUSES = [
  "Draft",
  "Applied",
  "Pending Manager Approval",
  "Approved",
  "Declined",
  "Received",
] as const;
export type FundingApplicationStatus = (typeof FUNDING_APPLICATION_STATUSES)[number];

// The only three funding sources selectable going forward — enforced by a
// <select>, not a free-text input (see funding-tab.tsx). Not a Postgres
// enum: existing funding_records already contain other values (e.g.
// "Maximus") that predate this restriction and must keep displaying
// correctly, so funding_source itself stays a plain text column.
export const FUNDING_SOURCES = ["Business Card", "BACS", "Voucher"] as const;
export type FundingSource = (typeof FUNDING_SOURCES)[number];

export const BUSINESS_STRUCTURES = [
  "Sole Trader",
  "Limited Company",
  "Partnership",
  "CIC",
  "Other",
] as const;
export type BusinessStructure = (typeof BUSINESS_STRUCTURES)[number];

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

export const GATEWAY_BOOKED_STATUSES = ["Not Booked", "Booked", "Completed"] as const;
export type GatewayBookedStatus = (typeof GATEWAY_BOOKED_STATUSES)[number];

export const GATEWAY_OUTCOMES = ["GSE", "NGSE"] as const;
export type GatewayOutcome = (typeof GATEWAY_OUTCOMES)[number];

export const DIGITAL_PRESENCE_STATUSES = ["Complete", "In Progress", "Not Started", "Not Needed"] as const;
export type DigitalPresenceStatus = (typeof DIGITAL_PRESENCE_STATUSES)[number];

export type ImportStatus = "Success" | "Partial" | "Failed";

export type AdvisorStatus = "Active" | "Inactive";

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

export type Office = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Advisor = {
  id: string;
  full_name: string;
  email: string;
  office_id: string;
  job_title: string | null;
  status: AdvisorStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

// One opaque referral link token per advisor — no longer used by the
// current referral flow (see Referral below), which uses a single shared
// picker page instead of per-advisor links. Table left in place rather
// than dropped; kept here since the rows still exist.
export type AdvisorReferralToken = {
  advisor_id: string;
  token: string;
  created_at: string;
};

export const REFERRAL_STATUSES = ["new", "accepted", "rejected"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

// advisor_id/advisor_name are the SE Advisor — who the referral is
// intended for, picked on the external page's first step; null for "No
// preference". referring_advisor_name is a separate concept: who actually
// submitted the referral, entered as a form field on the second step —
// never auto-filled from the SE Advisor pick. participant_name is null on
// every new submission (the external form collects only Advisor /
// Participant ENG / Business Idea); it's a legacy column, kept only
// because one real referral already has a value in it. See the External
// Self Employment Referral System (src/app/referral/page.tsx,
// src/lib/actions/referrals.ts).
export type Referral = {
  id: string;
  advisor_id: string | null;
  advisor_name: string | null;
  referring_advisor_name: string | null;
  participant_name: string | null;
  participant_eng: string;
  business_idea: string;
  status: ReferralStatus;
  submitted_at: string;
  accepted_at: string | null;
  accepted_participant_id: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

// Advisor PIN authentication credentials — one optional row per advisor
// (no row = no PIN configured yet). pin_hash/pin_salt are a scrypt digest,
// never the raw PIN. See src/lib/advisor-auth.ts.
export type AdvisorPinCredential = {
  advisor_id: string;
  pin_hash: string;
  pin_salt: string;
  failed_attempts: number;
  locked_until: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type ParticipantTransfer = {
  id: string;
  participant_id: string;
  from_advisor_id: string | null;
  to_advisor_id: string;
  from_office_id: string | null;
  to_office_id: string;
  transferred_by: string | null;
  notes: string | null;
  created_at: string;
};

export type Participant = {
  id: string;
  advisor_id: string;
  ptp_name: string;
  iconi_id: string | null;
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
  gateway_notes: string | null;
  gateway_booked_status: GatewayBookedStatus;
  gateway_appointment_date: string | null;
  gateway_outcome: GatewayOutcome | null;
  health_confidence: number | null;
  external_participant_id: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  national_insurance_number: string | null;
  status: ParticipantStatus;
  is_gse: boolean;
  gse_marked_at: string | null;
  gse_marked_by: string | null;
  claim_closed: boolean;
  claim_closed_at: string | null;
  claim_closed_by: string | null;
};

export type ParticipantStatusHistoryEntry = {
  id: string;
  participant_id: string;
  from_status: ParticipantStatus | null;
  to_status: ParticipantStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type TradingStart = {
  id: string;
  participant_id: string;
  trading_start_date: string;
  reason: TradingStartReason;
  original_advisor_id: string;
  iwt_advisor_id: string;
  transfer_date: string;
  evidence_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IwtReview = {
  id: string;
  trading_start_id: string;
  review_date: string;
  next_review_date: string | null;
  notes: string | null;
  reviewed_by_advisor_id: string | null;
  created_at: string;
};

export type OutcomeRecord = {
  id: string;
  trading_start_id: string;
  outcome_date: string;
  outcome_type: TradingStartReason;
  outcome_achieved: boolean;
  evidence: string | null;
  advisor_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgrammeSettings = {
  id: string;
  ngse_average_threshold: number;
  outcome_target: number;
  outcome_period_months: number;
  gse_outcome_period_months: number;
  updated_at: string;
  updated_by: string | null;
};

// Minimum Performance Level — one row per calendar month
// (effective_month, always the 1st). See src/lib/data/mpl.ts for how the
// applicable target for a given month is resolved.
export type MplTarget = {
  id: string;
  effective_month: string;
  trading_starts_mpl: number;
  outcomes_mpl: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

// ---------------------------------------------------------------------------
// Notifications — a live advisor work queue backed by a real table (see
// supabase/migrations/0018_notifications.sql). Only New / Unread / Action
// Required are "active" (shown in the Notifications panel); Reviewed and
// Archived are terminal, audit-only states. Adding a new automatic
// notification later only means adding one more value here plus a rule
// that calls createNotification — nothing else needs to change.
// ---------------------------------------------------------------------------
export const NOTIFICATION_TYPES = [
  "trading_start_eligible_gse",
  "trading_start_eligible_ngse",
  "trading_start_eligible_claim_closed",
  "income_submitted",
  "funding_approval_required",
  "funding_approved",
  "funding_declined",
  "transferred_to_iwt",
  "outcome_achieved",
  "upcoming_review",
  "referral_submitted",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["New", "Unread", "Action Required", "Reviewed", "Archived"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const ACTIVE_NOTIFICATION_STATUSES: NotificationStatus[] = ["New", "Unread", "Action Required"];

export type Notification = {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string;
  participant_id: string | null;
  advisor_id: string | null;
  related_id: string | null;
  dedupe_key: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  archived_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganisationSettings = {
  id: string;
  org_name: string;
  app_name: string;
  logo_path: string | null;
  logo_name: string | null;
  primary_color: string;
  secondary_color: string;
  updated_at: string;
  updated_by: string | null;
};

export type BusinessPlan = {
  id: string;
  participant_id: string;
  status: BusinessPlanStatus;
  file_path: string | null;
  file_name: string | null;
  updated_at: string;
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
  advisor_id: string;
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
  approved_by: string | null;
  approved_at: string | null;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HmrcBusinessInfo = {
  id: string;
  participant_id: string;
  business_structure: BusinessStructure | null;
  utr_number: string | null;
  vat_registered: boolean;
  paye_registered: boolean;
  business_bank_account: boolean;
  insurance_in_place: boolean;
  notes: string | null;
  updated_at: string;
};

export type DigitalPresenceItem = {
  id: string;
  participant_id: string;
  platform: DigitalPlatform;
  status: DigitalPresenceStatus;
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

// Gateway Readiness — a purely advisor-facing preparation checklist ahead
// of a participant's Universal Credit Gateway appointment. Deliberately
// has no recommendation/approval/decision fields: UC decides GSE vs NGSE
// (see GatewayOutcome and participants.gateway_outcome), not the advisor.
export type GatewayReadiness = {
  id: string;
  participant_id: string;
  trading_consistently: boolean;
  hours_worked_adequate: boolean;
  expected_to_make_profit: boolean;
  customer_base_established: boolean;
  business_sustainable: boolean;
  invoices_available: boolean;
  notes: string | null;
  updated_at: string;
};

export type IncomeTrackerEntry = {
  id: string;
  participant_id: string;
  month: string;
  entry_date: string;
  income: number;
  expense: number;
  mileage_cost: number;
  miles: number;
  declaration_file_path: string | null;
  declaration_file_name: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  source: string;
  created_at: string;
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
      offices: {
        Row: Office;
        Insert: Partial<Office> & { name: string };
        Update: Partial<Office>;
        Relationships: [];
      };
      advisors: {
        Row: Advisor;
        Insert: Partial<Advisor> & {
          full_name: string;
          email: string;
          office_id: string;
        };
        Update: Partial<Advisor>;
        Relationships: [];
      };
      participant_transfers: {
        Row: ParticipantTransfer;
        Insert: Partial<ParticipantTransfer> & {
          participant_id: string;
          to_advisor_id: string;
          to_office_id: string;
        };
        Update: Partial<ParticipantTransfer>;
        Relationships: [];
      };
      participants: {
        Row: Participant;
        Insert: Partial<Participant> & {
          advisor_id: string;
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
          advisor_id: string;
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
      gateway_readiness: {
        Row: GatewayReadiness;
        Insert: Partial<GatewayReadiness> & { participant_id: string };
        Update: Partial<GatewayReadiness>;
        Relationships: [];
      };
      income_tracker_entries: {
        Row: IncomeTrackerEntry;
        Insert: Partial<IncomeTrackerEntry> & {
          participant_id: string;
          month: string;
          entry_date: string;
        };
        Update: Partial<IncomeTrackerEntry>;
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
      participant_status_history: {
        Row: ParticipantStatusHistoryEntry;
        Insert: Partial<ParticipantStatusHistoryEntry> & {
          participant_id: string;
          to_status: ParticipantStatus;
        };
        Update: Partial<ParticipantStatusHistoryEntry>;
        Relationships: [];
      };
      trading_starts: {
        Row: TradingStart;
        Insert: Partial<TradingStart> & {
          participant_id: string;
          trading_start_date: string;
          reason: TradingStartReason;
          original_advisor_id: string;
          iwt_advisor_id: string;
          transfer_date: string;
        };
        Update: Partial<TradingStart>;
        Relationships: [];
      };
      iwt_reviews: {
        Row: IwtReview;
        Insert: Partial<IwtReview> & {
          trading_start_id: string;
          review_date: string;
        };
        Update: Partial<IwtReview>;
        Relationships: [];
      };
      outcome_records: {
        Row: OutcomeRecord;
        Insert: Partial<OutcomeRecord> & {
          trading_start_id: string;
          outcome_date: string;
          outcome_type: TradingStartReason;
          outcome_achieved: boolean;
        };
        Update: Partial<OutcomeRecord>;
        Relationships: [];
      };
      programme_settings: {
        Row: ProgrammeSettings;
        Insert: Partial<ProgrammeSettings>;
        Update: Partial<ProgrammeSettings>;
        Relationships: [];
      };
      mpl_targets: {
        Row: MplTarget;
        Insert: Partial<MplTarget> & {
          effective_month: string;
          trading_starts_mpl: number;
          outcomes_mpl: number;
        };
        Update: Partial<MplTarget>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & { title: string; body: string };
        Update: Partial<Announcement>;
        Relationships: [];
      };
      organisation_settings: {
        Row: OrganisationSettings;
        Insert: Partial<OrganisationSettings>;
        Update: Partial<OrganisationSettings>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { type: NotificationType; title: string; body: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      advisor_pin_credentials: {
        Row: AdvisorPinCredential;
        Insert: Partial<AdvisorPinCredential> & { advisor_id: string; pin_hash: string; pin_salt: string };
        Update: Partial<AdvisorPinCredential>;
        Relationships: [];
      };
      advisor_referral_tokens: {
        Row: AdvisorReferralToken;
        Insert: Partial<AdvisorReferralToken> & { advisor_id: string };
        Update: Partial<AdvisorReferralToken>;
        Relationships: [];
      };
      referrals: {
        Row: Referral;
        Insert: Partial<Referral> & {
          participant_eng: string;
          business_idea: string;
        };
        Update: Partial<Referral>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
