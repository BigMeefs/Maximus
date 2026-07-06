export type BusinessPlanStatus = "Not Started" | "In Progress" | "Complete";
export type ActionStatus = "Not Started" | "In Progress" | "Complete";

export type Profile = {
  id: string;
  full_name: string;
  created_at: string;
};

export type Participant = {
  id: string;
  advisor_id: string;
  ptp_name: string;
  business_name: string;
  previous_advisor: string | null;
  scheme_start_date: string;
  website: string | null;
  social_media_links: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
};

export type EvidenceFile = {
  id: string;
  participant_id: string;
  file_path: string;
  file_name: string;
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
