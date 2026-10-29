/**
 * Pen Program & Enrolled Accounts Types
 * Based on Microsoft 365 (OneDrive + Excel Online) Architecture
 */

export type AccountType = "private_clinic" | "pharmacy" | "medical_center";

export const INSULIN_PRODUCTS = [
  "جلارجيفين (Glargivin)",
  "هيوماكسين ميكس 70/30 (Humaxin Mix 70/30)",
  "هيوماكسين رابيد (Humaxin Rapid)",
] as const;

export interface EnrolledAccount {
  account_id: string;
  account_type: AccountType;
  account_name: string;
  specialty?: string; // Appears for private_clinic (e.g. Cardiology, Endocrinology, Internal Medicine)
  territory: string;
  phone: string;
  enrolled_by_rep: string; // Rep name or email
  pin_hash: string;
  raw_pin?: string; // For instant WhatsApp sharing right after generation
  allocated_pens: number;
  dispensed_count: number;
  current_balance: number;
  status: "active" | "suspended" | "pending";
  created_at: string;
}

export interface DispenseRecord {
  record_id: string;
  created_at: string;
  account_id: string;
  account_type: AccountType;
  account_name: string;
  recorded_by: string; // Rep Name or "Self-Service (Doctor/Pharmacist)"
  prescribing_doctor: string;
  patient_name: string;
  patient_phone: string;
  national_id: string;
  product_name: string; // The insulin product dispensed
  dispensed_qty: number;
  rx_image_id: string; // OneDrive item ID or download link
  id_image_id: string; // OneDrive item ID or download link
  consent_image_id: string; // OneDrive item ID or download link
  status: "approved" | "pending_review" | "rejected";
  notes?: string;
  is_exception?: boolean;
}

export interface StockRequest {
  request_id: string;
  created_at: string;
  account_id: string;
  account_name: string;
  account_type: AccountType;
  requested_by: string;
  requested_qty: number;
  approved_qty: number;
  status: "pending" | "approved" | "rejected";
  reviewed_at?: string;
  notes?: string;
}

export interface DispenseException {
  exception_id: string;
  created_at: string;
  account_id: string;
  account_name: string;
  account_type?: AccountType;
  patient_name: string;
  patient_phone: string;
  national_id: string;
  prescribing_doctor: string;
  product_name: string;
  pens_count: number;
  exception_reason: string;
  admin_status: "pending" | "approved" | "rejected" | "fulfilled";
  admin_notes?: string;
  reviewed_at?: string;
  fulfilled_at?: string;
}

export interface PatientHistoryMatch {
  record_id: string;
  patient_name: string;
  national_id: string;
  patient_phone: string;
  prescribing_doctor: string;
  account_name: string;
  product_name: string;
  dispensed_qty: number;
  created_at: string;
}

export interface StorageStatus {
  provider: "microsoft_365" | "offline_sandbox";
  excelConnected: boolean;
  oneDriveConnected: boolean;
  excelFilePath: string;
  oneDriveFolder: string;
  sharepointFolderUrl?: string;
}
