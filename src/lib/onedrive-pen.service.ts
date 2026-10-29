/**
 * Client-Side Service Bridge for Pen Program
 * Communicates with the OneDrive + Excel Online DB layer.
 */

import { oneDrivePenDb } from "./onedrive-db";
import type {
  EnrolledAccount,
  DispenseRecord,
  StockRequest,
  DispenseException,
  PatientHistoryMatch,
  AccountType,
  StorageStatus,
} from "./pen-program.types";

export const penService = {
  // Accounts
  async getAccounts(): Promise<EnrolledAccount[]> {
    return await oneDrivePenDb.getAccounts();
  },

  async getAccountById(id: string): Promise<EnrolledAccount | null> {
    return await oneDrivePenDb.getAccountById(id);
  },

  async authenticateByPin(pin: string): Promise<EnrolledAccount | null> {
    return await oneDrivePenDb.authenticateByPin(pin);
  },

  async enrollAccount(data: {
    account_type: AccountType;
    account_name: string;
    specialty?: string;
    territory: string;
    phone: string;
    enrolled_by_rep: string;
    pin: string;
    initial_allocated_pens: number;
  }): Promise<EnrolledAccount> {
    return await oneDrivePenDb.addAccount({
      account_type: data.account_type,
      account_name: data.account_name.trim(),
      specialty: data.specialty?.trim(),
      territory: data.territory.trim(),
      phone: data.phone.trim(),
      enrolled_by_rep: data.enrolled_by_rep.trim(),
      pin_hash: data.pin,
      raw_pin: data.pin,
      allocated_pens: Number(data.initial_allocated_pens) || 0,
    });
  },

  async adjustStock(
    accountId: string,
    amount: number,
    action: "add" | "remove"
  ): Promise<boolean> {
    return await oneDrivePenDb.adjustStock(accountId, amount, action);
  },

  async resetPin(accountId: string, explicitPin?: string): Promise<string> {
    return await oneDrivePenDb.resetPin(accountId, explicitPin);
  },

  // Patient History & Duplicate Detection
  async checkPatientHistory(
    nationalId: string,
    phoneNumber: string
  ): Promise<PatientHistoryMatch[]> {
    return await oneDrivePenDb.checkPatientHistory(nationalId, phoneNumber);
  },

  // Dispenses
  async getDispenses(): Promise<DispenseRecord[]> {
    return await oneDrivePenDb.getDispenses();
  },

  async recordDispense(data: {
    account_id: string;
    account_type: AccountType;
    account_name: string;
    recorded_by: string;
    prescribing_doctor: string;
    patient_name: string;
    patient_phone: string;
    national_id: string;
    product_name?: string;
    rx_image_id: string;
    id_image_id: string;
    consent_image_id: string;
    dispensed_qty?: number;
    notes?: string;
    is_exception?: boolean;
  }): Promise<DispenseRecord> {
    return await oneDrivePenDb.addDispense({
      account_id: data.account_id,
      account_type: data.account_type,
      account_name: data.account_name,
      recorded_by: data.recorded_by,
      prescribing_doctor: data.prescribing_doctor,
      patient_name: data.patient_name,
      patient_phone: data.patient_phone,
      national_id: data.national_id,
      product_name: data.product_name || "Regular Insulin",
      rx_image_id: data.rx_image_id,
      id_image_id: data.id_image_id,
      consent_image_id: data.consent_image_id,
      dispensed_qty: data.dispensed_qty || 1,
      notes: data.notes,
      is_exception: data.is_exception,
    });
  },

  // Document Upload to OneDrive
  async uploadDocument(
    base64Data: string,
    accountType: string,
    accountName: string,
    fileName: string
  ): Promise<{ fileId: string; downloadUrl: string }> {
    return await oneDrivePenDb.uploadPatientDocumentToOneDrive(
      base64Data,
      accountType,
      accountName,
      fileName
    );
  },

  // Stock Requests
  async getStockRequests(): Promise<StockRequest[]> {
    return await oneDrivePenDb.getStockRequests();
  },

  async requestStock(data: {
    account_id: string;
    account_name: string;
    account_type: AccountType;
    requested_by: string;
    requested_qty: number;
    notes?: string;
  }): Promise<StockRequest> {
    return await oneDrivePenDb.addStockRequest(data);
  },

  async reviewStockRequest(
    requestId: string,
    action: "approve" | "reject",
    approvedQty = 0,
    adminNotes?: string
  ): Promise<boolean> {
    return await oneDrivePenDb.reviewStockRequest(requestId, action, approvedQty, adminNotes);
  },

  // Exceptions
  async getExceptions(): Promise<DispenseException[]> {
    return await oneDrivePenDb.getExceptions();
  },

  async requestException(data: {
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
  }): Promise<DispenseException> {
    return await oneDrivePenDb.addException(data);
  },

  async reviewException(
    exceptionId: string,
    action: "approve" | "reject",
    adminNotes?: string
  ): Promise<boolean> {
    return await oneDrivePenDb.reviewException(exceptionId, action, adminNotes);
  },

  async fulfillApprovedException(exceptionId: string): Promise<DispenseRecord> {
    return await oneDrivePenDb.fulfillApprovedException(exceptionId);
  },

  // Analytics & Stats
  getOverviewStats() {
    return oneDrivePenDb.getOverviewStats();
  },

  getStorageStatus(): StorageStatus {
    return oneDrivePenDb.getStorageStatus();
  },

  clearAllData(): void {
    oneDrivePenDb.clearAllData();
  },

  exportBackup(): string {
    return oneDrivePenDb.exportBackup();
  },
};
