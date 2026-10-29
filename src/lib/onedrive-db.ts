/**
 * Microsoft 365 (OneDrive + Excel Online) Integration Layer
 * Connects directly to Microsoft Graph API for Excel Online tables and OneDrive file storage.
 * Runs in clean mode (ZERO mock/dummy data) with persistent browser storage fallback.
 */

import type {
  EnrolledAccount,
  DispenseRecord,
  StockRequest,
  DispenseException,
  PatientHistoryMatch,
  StorageStatus,
} from "./pen-program.types";
import { supabase } from "./supabase";

// Configuration from Vite environment variables (or process.env fallback)
const getEnv = (key: string, defaultVal = ""): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env as Record<string, string | undefined>)[key] || defaultVal;
  }
  const proc = (globalThis as any).process;
  if (proc?.env) {
    return (proc.env[key] as string) || defaultVal;
  }
  return defaultVal;
};

const MS_CONFIG = {
  tenantId: getEnv("VITE_MS_TENANT_ID"),
  clientId: getEnv("VITE_MS_CLIENT_ID"),
  clientSecret: getEnv("VITE_MS_CLIENT_SECRET"),
  accessToken: getEnv("VITE_MS_GRAPH_ACCESS_TOKEN"),
  excelFileId: getEnv("VITE_MS_EXCEL_FILE_ID", "Pen_Database.xlsx"),
  uploadFolderId: getEnv("VITE_MS_UPLOAD_FOLDER_ID", "EVA Insulin Pen Program"),
  sharepointFolderUrl: getEnv(
    "VITE_MS_SHAREPOINT_FOLDER_URL",
    "https://evapharma-my.sharepoint.com/:f:/r/personal/hady_mohamed_evapharma_com/Documents/EVA%20Insulin%20Pen%20Program?d=wc9148c5fdbba4f70a5b2d11c8e958454&csf=1&web=1&e=isqATz"
  ),
  graphEndpoint: "https://graph.microsoft.com/v1.0",
};

// SHA-256 equivalent hashing for PIN codes
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "_synaps_salt_2026");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return "hash_" + Math.abs(hash).toString(16);
}

// STORAGE KEY
const LOCAL_STORAGE_KEY = "synaps_pen_program_clean_v1";

// 100% CLEAN INITIAL STATE (NO MOCK DATA)
const INITIAL_ACCOUNTS: EnrolledAccount[] = [];
const INITIAL_DISPENSES: DispenseRecord[] = [];
const INITIAL_STOCK_REQUESTS: StockRequest[] = [];
const INITIAL_EXCEPTIONS: DispenseException[] = [];

class OneDriveDatabaseStore {
  private accounts: EnrolledAccount[] = [];
  private dispenses: DispenseRecord[] = [];
  private stockRequests: StockRequest[] = [];
  private exceptions: DispenseException[] = [];
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") {
      this.accounts = [...INITIAL_ACCOUNTS];
      this.dispenses = [...INITIAL_DISPENSES];
      this.stockRequests = [...INITIAL_STOCK_REQUESTS];
      this.exceptions = [...INITIAL_EXCEPTIONS];
      return;
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
        this.dispenses = Array.isArray(parsed.dispenses) ? parsed.dispenses : [];
        this.stockRequests = Array.isArray(parsed.stockRequests) ? parsed.stockRequests : [];
        this.exceptions = Array.isArray(parsed.exceptions) ? parsed.exceptions : [];
      } else {
        this.accounts = [];
        this.dispenses = [];
        this.stockRequests = [];
        this.exceptions = [];
        this.saveToStorage();
      }
    } catch {
      this.accounts = [];
      this.dispenses = [];
      this.stockRequests = [];
      this.exceptions = [];
    }
    this.isLoaded = true;
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          accounts: this.accounts,
          dispenses: this.dispenses,
          stockRequests: this.stockRequests,
          exceptions: this.exceptions,
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error("[Storage] Failed to persist data to localStorage:", e);
    }
  }

  // ==========================================
  // ACCOUNTS MANAGEMENT (Table: Tbl_Enrolled_Accounts)
  // ==========================================
  public async getAccounts(): Promise<EnrolledAccount[]> {
    this.loadFromStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("enrolled_accounts")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.accounts = data.map((d: any) => ({
            account_id: d.account_id,
            account_type: d.account_type,
            account_name: d.account_name,
            specialty: d.specialty || "",
            territory: d.territory,
            phone: d.phone,
            enrolled_by_rep: d.enrolled_by_rep || "",
            pin_hash: d.pin_hash,
            raw_pin: d.raw_pin || "",
            allocated_pens: Number(d.allocated_pens) || 0,
            dispensed_count: Number(d.dispensed_count) || 0,
            current_balance: Number(d.current_balance) || 0,
            status: d.status || "active",
            created_at: d.created_at,
          }));
          this.saveToStorage();
        }
      } catch (e) {
        console.warn("[DB] Supabase getAccounts error:", e);
      }
    }
    return [...this.accounts];
  }

  public async getAccountById(id: string): Promise<EnrolledAccount | null> {
    this.loadFromStorage();
    return this.accounts.find((a) => a.account_id === id) || null;
  }

  public async authenticateByPin(pin: string): Promise<EnrolledAccount | null> {
    this.loadFromStorage();
    const cleanPin = pin.trim();
    const hashed = await hashPin(cleanPin);

    // Matches hash or direct raw PIN
    return (
      this.accounts.find(
        (a) =>
          a.status === "active" &&
          (a.pin_hash === hashed || a.pin_hash === cleanPin || a.raw_pin === cleanPin)
      ) || null
    );
  }

  public async addAccount(
    account: Omit<
      EnrolledAccount,
      "account_id" | "dispensed_count" | "current_balance" | "status" | "created_at"
    >
  ): Promise<EnrolledAccount> {
    this.loadFromStorage();

    const nextNum = 100 + this.accounts.length + 1;
    const accountId = `ACC-${nextNum}`;

    const newAcc: EnrolledAccount = {
      ...account,
      account_id: accountId,
      allocated_pens: Number(account.allocated_pens) || 0,
      dispensed_count: 0,
      current_balance: Number(account.allocated_pens) || 0,
      status: "active",
      created_at: new Date().toISOString(),
    };

    this.accounts.unshift(newAcc);
    this.saveToStorage();

    // 1. Sync to Supabase Table: enrolled_accounts
    if (supabase) {
      try {
        await supabase.from("enrolled_accounts").upsert({
          account_id: newAcc.account_id,
          account_type: newAcc.account_type,
          account_name: newAcc.account_name,
          specialty: newAcc.specialty || "",
          territory: newAcc.territory,
          phone: newAcc.phone,
          enrolled_by_rep: newAcc.enrolled_by_rep || "",
          pin_hash: newAcc.pin_hash,
          raw_pin: newAcc.raw_pin || "",
          allocated_pens: newAcc.allocated_pens,
          dispensed_count: newAcc.dispensed_count,
          current_balance: newAcc.current_balance,
          status: newAcc.status,
          created_at: newAcc.created_at,
        });
      } catch (e) {
        console.warn("[DB] Supabase addAccount error:", e);
      }
    }

    // 2. Async sync to Excel Online Table: Tbl_Enrolled_Accounts
    void this.syncToExcelTable("Tbl_Enrolled_Accounts", [
      newAcc.account_id,
      newAcc.account_type,
      newAcc.account_name,
      newAcc.specialty || "",
      newAcc.territory,
      newAcc.phone,
      newAcc.enrolled_by_rep,
      newAcc.pin_hash,
      newAcc.allocated_pens,
      newAcc.dispensed_count,
      newAcc.current_balance,
      newAcc.status,
      newAcc.created_at,
    ]);

    return newAcc;
  }

  public async adjustStock(
    accountId: string,
    amount: number,
    action: "add" | "remove"
  ): Promise<boolean> {
    this.loadFromStorage();
    const idx = this.accounts.findIndex((a) => a.account_id === accountId);
    if (idx === -1) return false;

    const acc = this.accounts[idx];
    const qty = Math.abs(amount);

    if (action === "remove" && qty > acc.current_balance) {
      throw new Error("Cannot deduct a quantity greater than available stock balance");
    }

    const newAllocated = action === "add" ? acc.allocated_pens + qty : acc.allocated_pens;
    const newBalance = action === "add" ? acc.current_balance + qty : acc.current_balance - qty;

    this.accounts[idx] = {
      ...acc,
      allocated_pens: newAllocated,
      current_balance: newBalance,
    };

    this.saveToStorage();

    if (supabase) {
      try {
        await supabase
          .from("enrolled_accounts")
          .update({
            allocated_pens: newAllocated,
            current_balance: newBalance,
          })
          .eq("account_id", accountId);
      } catch (e) {
        console.warn("[DB] Supabase adjustStock error:", e);
      }
    }

    return true;
  }

  public async resetPin(accountId: string, explicitPin?: string): Promise<string> {
    this.loadFromStorage();
    const idx = this.accounts.findIndex((a) => a.account_id === accountId);
    if (idx === -1) throw new Error("Account not found");

    const newPin = explicitPin || Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await hashPin(newPin);

    this.accounts[idx] = {
      ...this.accounts[idx],
      raw_pin: newPin,
      pin_hash: hashed,
    };

    this.saveToStorage();

    if (supabase) {
      try {
        await supabase
          .from("enrolled_accounts")
          .update({
            raw_pin: newPin,
            pin_hash: hashed,
          })
          .eq("account_id", accountId);
      } catch (e) {
        console.warn("[DB] Supabase resetPin error:", e);
      }
    }

    return newPin;
  }

  // ==========================================
  // DISPENSES MANAGEMENT (Table: Tbl_Dispenses)
  // ==========================================
  public async getDispenses(): Promise<DispenseRecord[]> {
    this.loadFromStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("dispenses")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.dispenses = data.map((d: any) => ({
            record_id: d.record_id,
            account_id: d.account_id,
            account_type: d.account_type,
            account_name: d.account_name,
            recorded_by: d.recorded_by,
            prescribing_doctor: d.prescribing_doctor,
            patient_name: d.patient_name,
            patient_phone: d.patient_phone,
            national_id: d.national_id,
            product_name: d.product_name || "جلارجيفين (Glargivin)",
            dispensed_qty: Number(d.dispensed_qty) || 1,
            rx_image_id: d.rx_image_id || "",
            id_image_id: d.id_image_id || "",
            consent_image_id: d.consent_image_id || "",
            status: d.status || "approved",
            is_exception: Boolean(d.is_exception),
            notes: d.notes || "",
            created_at: d.created_at,
          }));
          this.saveToStorage();
        }
      } catch (e) {
        console.warn("[DB] Supabase getDispenses warning:", e);
      }
    }
    return [...this.dispenses];
  }

  // Check patient dispense history by National ID or Phone Number
  public async checkPatientHistory(
    nationalId: string,
    phoneNumber: string
  ): Promise<PatientHistoryMatch[]> {
    this.loadFromStorage();
    const cleanNid = nationalId.trim().replace(/\D/g, "");
    const cleanPhone = phoneNumber.trim().replace(/\D/g, "");

    if (cleanNid.length < 14 && cleanPhone.length < 10) {
      return [];
    }

    const matches: PatientHistoryMatch[] = [];

    for (const d of this.dispenses) {
      const dNid = (d.national_id || "").trim().replace(/\D/g, "");
      const dPhone = (d.patient_phone || "").trim().replace(/\D/g, "");

      const matchNid = cleanNid.length === 14 && dNid === cleanNid;
      const matchPhone = cleanPhone.length >= 10 && dPhone.includes(cleanPhone.slice(-10));

      if (matchNid || matchPhone) {
        matches.push({
          record_id: d.record_id,
          patient_name: d.patient_name,
          national_id: d.national_id,
          patient_phone: d.patient_phone,
          prescribing_doctor: d.prescribing_doctor,
          account_name: d.account_name,
          product_name: d.product_name || "جلارجيفين (Glargivin)",
          dispensed_qty: d.dispensed_qty || 1,
          created_at: d.created_at,
        });
      }
    }

    return matches.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async addDispense(
    dispense: Omit<DispenseRecord, "record_id" | "created_at" | "status">
  ): Promise<DispenseRecord> {
    this.loadFromStorage();

    const recordId = `DSP-${Date.now().toString().slice(-6)}`;
    const newDispense: DispenseRecord = {
      ...dispense,
      record_id: recordId,
      created_at: new Date().toISOString(),
      status: "approved",
      dispensed_qty: dispense.dispensed_qty || 1,
      product_name: dispense.product_name || "جلارجيفين (Glargivin)",
    };

    // Deduct stock balance from the related enrolled account
    const accIdx = this.accounts.findIndex((a) => a.account_id === dispense.account_id);
    if (accIdx !== -1) {
      const current = this.accounts[accIdx];
      const qty = newDispense.dispensed_qty;
      this.accounts[accIdx] = {
        ...current,
        dispensed_count: current.dispensed_count + qty,
        current_balance: Math.max(0, current.current_balance - qty),
      };
    }

    this.dispenses.unshift(newDispense);
    this.saveToStorage();

    // 1. Sync to Supabase Table: dispenses
    if (supabase) {
      try {
        await supabase.from("dispenses").upsert({
          record_id: newDispense.record_id,
          account_id: newDispense.account_id,
          account_type: newDispense.account_type,
          account_name: newDispense.account_name,
          recorded_by: newDispense.recorded_by,
          prescribing_doctor: newDispense.prescribing_doctor,
          patient_name: newDispense.patient_name,
          patient_phone: newDispense.patient_phone,
          national_id: newDispense.national_id,
          product_name: newDispense.product_name,
          dispensed_qty: newDispense.dispensed_qty,
          rx_image_id: newDispense.rx_image_id || "",
          id_image_id: newDispense.id_image_id || "",
          consent_image_id: newDispense.consent_image_id || "",
          status: newDispense.status,
          is_exception: Boolean(newDispense.is_exception),
          notes: newDispense.notes || "",
          created_at: newDispense.created_at,
        });

        if (accIdx !== -1) {
          const current = this.accounts[accIdx];
          await supabase
            .from("enrolled_accounts")
            .update({
              dispensed_count: current.dispensed_count,
              current_balance: current.current_balance,
            })
            .eq("account_id", current.account_id);
        }
      } catch (e) {
        console.warn("[DB] Supabase addDispense warning:", e);
      }
    }

    // 2. Async sync to Excel Online Table: Tbl_Dispenses
    void this.syncToExcelTable("Tbl_Dispenses", [
      newDispense.record_id,
      newDispense.created_at,
      newDispense.account_id,
      newDispense.account_type,
      newDispense.account_name,
      newDispense.recorded_by,
      newDispense.prescribing_doctor,
      newDispense.patient_name,
      newDispense.patient_phone,
      newDispense.national_id,
      newDispense.product_name,
      newDispense.dispensed_qty,
      newDispense.rx_image_id,
      newDispense.id_image_id,
      newDispense.consent_image_id,
      newDispense.status,
    ]);

    return newDispense;
  }

  // ==========================================
  // STOCK REQUESTS (Table: Tbl_Stock_Requests)
  // ==========================================
  public async getStockRequests(): Promise<StockRequest[]> {
    this.loadFromStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("stock_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.stockRequests = data.map((r: any) => ({
            request_id: r.request_id,
            account_id: r.account_id,
            account_name: r.account_name,
            account_type: r.account_type,
            requested_by: r.requested_by,
            requested_qty: Number(r.requested_qty) || 20,
            approved_qty: Number(r.approved_qty) || 0,
            status: r.status || "pending",
            notes: r.admin_notes || "",
            created_at: r.created_at,
            reviewed_at: r.reviewed_at,
          }));
          this.saveToStorage();
        }
      } catch (e) {
        console.warn("[DB] Supabase getStockRequests warning:", e);
      }
    }
    return [...this.stockRequests];
  }

  public async addStockRequest(
    req: Omit<StockRequest, "request_id" | "created_at" | "approved_qty" | "status">
  ): Promise<StockRequest> {
    this.loadFromStorage();
    const requestId = `REQ-${Date.now().toString().slice(-5)}`;
    const newReq: StockRequest = {
      ...req,
      request_id: requestId,
      created_at: new Date().toISOString(),
      approved_qty: 0,
      status: "pending",
    };

    this.stockRequests.unshift(newReq);
    this.saveToStorage();

    if (supabase) {
      try {
        await supabase.from("stock_requests").upsert({
          request_id: newReq.request_id,
          account_id: newReq.account_id,
          account_name: newReq.account_name,
          account_type: newReq.account_type,
          requested_by: newReq.requested_by,
          requested_qty: newReq.requested_qty,
          status: newReq.status,
          admin_notes: newReq.notes || "",
          created_at: newReq.created_at,
        });
      } catch (e) {
        console.warn("[DB] Supabase addStockRequest warning:", e);
      }
    }

    void this.syncToExcelTable("Tbl_Stock_Requests", [
      newReq.request_id,
      newReq.created_at,
      newReq.account_id,
      newReq.account_name,
      newReq.account_type,
      newReq.requested_by,
      newReq.requested_qty,
      newReq.approved_qty,
      newReq.status,
      newReq.reviewed_at || "",
    ]);

    return newReq;
  }

  public async reviewStockRequest(
    requestId: string,
    action: "approve" | "reject",
    approvedQty = 0,
    adminNotes?: string
  ): Promise<boolean> {
    this.loadFromStorage();
    const idx = this.stockRequests.findIndex((r) => r.request_id === requestId);
    if (idx === -1) return false;

    const request = this.stockRequests[idx];
    const qty = action === "approve" ? approvedQty || request.requested_qty : 0;

    this.stockRequests[idx] = {
      ...request,
      status: action === "approve" ? "approved" : "rejected",
      approved_qty: qty,
      reviewed_at: new Date().toISOString(),
      notes: adminNotes || request.notes,
    };

    // If approved, credit pens to the account
    if (action === "approve" && qty > 0) {
      const accIdx = this.accounts.findIndex((a) => a.account_id === request.account_id);
      if (accIdx !== -1) {
        const acc = this.accounts[accIdx];
        this.accounts[accIdx] = {
          ...acc,
          allocated_pens: acc.allocated_pens + qty,
          current_balance: acc.current_balance + qty,
        };

        if (supabase) {
          try {
            await supabase
              .from("enrolled_accounts")
              .update({
                allocated_pens: this.accounts[accIdx].allocated_pens,
                current_balance: this.accounts[accIdx].current_balance,
              })
              .eq("account_id", acc.account_id);
          } catch {}
        }
      }
    }

    this.saveToStorage();

    if (supabase) {
      try {
        await supabase
          .from("stock_requests")
          .update({
            status: action === "approve" ? "approved" : "rejected",
            admin_notes: adminNotes || request.notes,
          })
          .eq("request_id", requestId);
      } catch (e) {
        console.warn("[DB] Supabase reviewStockRequest warning:", e);
      }
    }

    return true;
  }

  // ==========================================
  // EXCEPTIONS (Table: Tbl_Exceptions)
  // ==========================================
  public async getExceptions(): Promise<DispenseException[]> {
    this.loadFromStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("dispense_exceptions")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.exceptions = data.map((e: any) => ({
            exception_id: e.exception_id,
            account_id: e.account_id,
            account_name: e.account_name,
            account_type: e.account_type,
            patient_name: e.patient_name,
            patient_phone: e.patient_phone,
            national_id: e.national_id,
            prescribing_doctor: e.prescribing_doctor,
            product_name: e.product_name || "جلارجيفين (Glargivin)",
            pens_count: Number(e.pens_count) || 1,
            exception_reason: e.exception_reason,
            admin_status: e.admin_status || "pending",
            admin_notes: e.admin_notes || "",
            created_at: e.created_at,
            fulfilled_at: e.fulfilled_at,
          }));
          this.saveToStorage();
        }
      } catch (e) {
        console.warn("[DB] Supabase getExceptions warning:", e);
      }
    }
    return [...this.exceptions];
  }

  public async addException(
    exc: Omit<DispenseException, "exception_id" | "created_at" | "admin_status">
  ): Promise<DispenseException> {
    this.loadFromStorage();
    const newId = `EXC-${Date.now().toString().slice(-5)}`;
    const newExc: DispenseException = {
      ...exc,
      exception_id: newId,
      created_at: new Date().toISOString(),
      admin_status: "pending",
      pens_count: exc.pens_count || 1,
      product_name: exc.product_name || "جلارجيفين (Glargivin)",
    };

    this.exceptions.unshift(newExc);
    this.saveToStorage();

    if (supabase) {
      try {
        await supabase.from("dispense_exceptions").upsert({
          exception_id: newExc.exception_id,
          account_id: newExc.account_id,
          account_name: newExc.account_name,
          account_type: newExc.account_type,
          patient_name: newExc.patient_name,
          patient_phone: newExc.patient_phone,
          national_id: newExc.national_id,
          prescribing_doctor: newExc.prescribing_doctor,
          product_name: newExc.product_name,
          pens_count: newExc.pens_count,
          exception_reason: newExc.exception_reason,
          admin_status: newExc.admin_status,
          admin_notes: newExc.admin_notes || "",
          created_at: newExc.created_at,
        });
      } catch (e) {
        console.warn("[DB] Supabase addException warning:", e);
      }
    }

    void this.syncToExcelTable("Tbl_Exceptions", [
      newExc.exception_id,
      newExc.created_at,
      newExc.account_id,
      newExc.account_name,
      newExc.patient_name,
      newExc.patient_phone,
      newExc.national_id,
      newExc.prescribing_doctor,
      newExc.product_name,
      newExc.pens_count,
      newExc.exception_reason,
      newExc.admin_status,
      newExc.admin_notes || "",
    ]);

    return newExc;
  }

  public async reviewException(
    exceptionId: string,
    action: "approve" | "reject",
    adminNotes?: string
  ): Promise<boolean> {
    this.loadFromStorage();
    const idx = this.exceptions.findIndex((e) => e.exception_id === exceptionId);
    if (idx === -1) return false;

    this.exceptions[idx] = {
      ...this.exceptions[idx],
      admin_status: action === "approve" ? "approved" : "rejected",
      admin_notes: adminNotes || this.exceptions[idx].admin_notes,
      reviewed_at: new Date().toISOString(),
    };

    this.saveToStorage();

    if (supabase) {
      try {
        await supabase
          .from("dispense_exceptions")
          .update({
            admin_status: action === "approve" ? "approved" : "rejected",
            admin_notes: adminNotes || this.exceptions[idx].admin_notes,
          })
          .eq("exception_id", exceptionId);
      } catch (e) {
        console.warn("[DB] Supabase reviewException warning:", e);
      }
    }

    return true;
  }

  // Fulfill an approved exception by Doctor or Pharmacy
  public async fulfillApprovedException(exceptionId: string): Promise<DispenseRecord> {
    this.loadFromStorage();
    const idx = this.exceptions.findIndex((e) => e.exception_id === exceptionId);
    if (idx === -1) throw new Error("Exception request not found");

    const exc = this.exceptions[idx];
    if (exc.admin_status !== "approved") {
      throw new Error("Cannot dispense this exception because it has not been approved by administration yet");
    }

    // Check account balance
    const acc = this.accounts.find((a) => a.account_id === exc.account_id);
    if (!acc) throw new Error("Dispensing facility not found");
    if (acc.current_balance < exc.pens_count) {
      throw new Error(`Available stock balance (${acc.current_balance} pens) is insufficient to dispense ${exc.pens_count} pens`);
    }

    // Mark exception as fulfilled
    this.exceptions[idx] = {
      ...exc,
      admin_status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase
          .from("dispense_exceptions")
          .update({
            admin_status: "fulfilled",
            fulfilled_at: this.exceptions[idx].fulfilled_at,
          })
          .eq("exception_id", exceptionId);
      } catch {}
    }

    // Create dispense record
    const record = await this.addDispense({
      account_id: exc.account_id,
      account_type: exc.account_type || acc.account_type,
      account_name: exc.account_name,
      recorded_by: `Approved Exception Dispense (${exc.account_name})`,
      prescribing_doctor: exc.prescribing_doctor || "Authorized Physician",
      patient_name: exc.patient_name,
      patient_phone: exc.patient_phone,
      national_id: exc.national_id,
      product_name: exc.product_name,
      dispensed_qty: exc.pens_count,
      rx_image_id: "",
      id_image_id: "",
      consent_image_id: "",
      is_exception: true,
      notes: `Dispensed under Exception #${exc.exception_id}. Reason: ${exc.exception_reason}`,
    });

    this.saveToStorage();
    return record;
  }

  // ==========================================
  // OVERVIEW ANALYTICS & STATS
  // ==========================================
  public getOverviewStats() {
    this.loadFromStorage();

    const totalAllocated = this.accounts.reduce((sum, a) => sum + a.allocated_pens, 0);
    const totalDispensed = this.dispenses.reduce((sum, d) => sum + (d.dispensed_qty || 1), 0);
    const remainingStock = this.accounts.reduce((sum, a) => sum + a.current_balance, 0);

    // Distinct patients served by national_id or phone
    const patientKeys = new Set<string>();
    this.dispenses.forEach((d) => {
      const key = (d.national_id && d.national_id.trim()) || (d.patient_phone && d.patient_phone.trim()) || d.patient_name;
      if (key) patientKeys.add(key);
    });
    const patientsServed = patientKeys.size;

    // Daily Dispensing Trend (Last 14-30 days)
    const trendMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" });
      trendMap[key] = 0;
    }

    this.dispenses.forEach((d) => {
      const dateKey = new Date(d.created_at).toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" });
      if (trendMap[dateKey] !== undefined) {
        trendMap[dateKey] += d.dispensed_qty || 1;
      }
    });

    const chartData = Object.entries(trendMap).map(([date, pens]) => ({
      date,
      pens,
    }));

    // Top Accounts Ranking
    const accStats: Record<string, { name: string; type: string; pens: number }> = {};
    this.accounts.forEach((a) => {
      accStats[a.account_id] = { name: a.account_name, type: a.account_type, pens: a.dispensed_count };
    });

    const topAccounts = Object.values(accStats)
      .sort((a, b) => b.pens - a.pens)
      .slice(0, 5);

    return {
      totalAllocated,
      totalDispensed,
      remainingStock,
      patientsServed,
      chartData,
      topAccounts,
    };
  }

  // ==========================================
  // ONEDRIVE FILE UPLOAD (Patient Documents)
  // ==========================================
  public async uploadPatientDocumentToOneDrive(
    base64Data: string,
    accountType: string,
    accountName: string,
    fileName: string
  ): Promise<{ fileId: string; downloadUrl: string }> {
    const cleanAccount = accountName.replace(/[\/\\?%*:|"<>]/g, "_");
    const safeType = accountType || "general";
    const path = `Patient_Documents/${safeType}/${cleanAccount}/${fileName}`;

    if (MS_CONFIG.accessToken || (MS_CONFIG.clientId && MS_CONFIG.clientSecret)) {
      try {
        const token = await this.getGraphAccessToken();
        if (token) {
          const endpoint = `${MS_CONFIG.graphEndpoint}/me/drive/items/${MS_CONFIG.uploadFolderId}:/${safeType}/${cleanAccount}/${fileName}:/content`;
          const base64Clean = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
          const binary = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));

          const res = await fetch(endpoint, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "image/jpeg",
            },
            body: binary,
          });

          if (res.ok) {
            const json = await res.json();
            return {
              fileId: json.id,
              downloadUrl: json["@microsoft.graph.downloadUrl"] || base64Data,
            };
          }
        }
      } catch (err) {
        console.warn("[OneDrive] Graph upload failed, falling back to local:", err);
      }
    }

    return {
      fileId: `onedrive://${path}`,
      downloadUrl: base64Data,
    };
  }

  // ==========================================
  // STATUS & AUTHENTICATION
  // ==========================================
  public getStorageStatus(): StorageStatus {
    const hasLiveAuth = !!(MS_CONFIG.accessToken || (MS_CONFIG.clientId && MS_CONFIG.clientSecret));
    return {
      provider: hasLiveAuth ? "microsoft_365" : "offline_sandbox",
      excelConnected: hasLiveAuth,
      oneDriveConnected: hasLiveAuth,
      excelFilePath: `${MS_CONFIG.uploadFolderId} / ${MS_CONFIG.excelFileId}`,
      oneDriveFolder: `${MS_CONFIG.uploadFolderId} / Patient_Documents`,
      sharepointFolderUrl: MS_CONFIG.sharepointFolderUrl,
    };
  }

  private async getGraphAccessToken(): Promise<string | null> {
    if (MS_CONFIG.accessToken) return MS_CONFIG.accessToken;
    if (!MS_CONFIG.clientId || !MS_CONFIG.tenantId || !MS_CONFIG.clientSecret) return null;

    try {
      const tokenUrl = `https://login.microsoftonline.com/${MS_CONFIG.tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id: MS_CONFIG.clientId,
        client_secret: MS_CONFIG.clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      });

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.access_token || null;
    } catch {
      return null;
    }
  }

  private async syncToExcelTable(tableName: string, rowValues: any[]) {
    const token = await this.getGraphAccessToken();
    if (!token) return;

    try {
      const endpoint = `${MS_CONFIG.graphEndpoint}/me/drive/items/${MS_CONFIG.excelFileId}/workbook/tables/${tableName}/rows/add`;
      await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [rowValues] }),
      });
    } catch (e) {
      console.warn(`[ExcelSync] Failed to sync to ${tableName}:`, e);
    }
  }

  public clearAllData(): void {
    this.accounts = [];
    this.dispenses = [];
    this.stockRequests = [];
    this.exceptions = [];
    this.saveToStorage();
  }

  public exportBackup(): string {
    return JSON.stringify(
      {
        accounts: this.accounts,
        dispenses: this.dispenses,
        stockRequests: this.stockRequests,
        exceptions: this.exceptions,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export const oneDrivePenDb = new OneDriveDatabaseStore();
