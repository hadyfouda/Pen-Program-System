/**
 * Corporate Email & Passcode Authentication Service for EVA Pharma Pen Program
 *
 * Flow:
 * 1. User enters their corporate @evapharma.com email.
 * 2. If first time or forgot password: a 6-digit passcode is sent to their corporate email.
 * 3. User enters the passcode, which opens the "Set Password" screen.
 * 4. User sets their secure password. Account is saved with their hashed password.
 * 5. On future logins, user simply enters their email and saved password!
 */

import { emailDeliveryService, type SendPasscodeResult } from "./email-delivery.service";

export type CorporateRole = "District Manager" | "Medical Rep" | "Program Administrator";

export interface CorporateUser {
  id: string;
  email: string;
  displayName: string;
  role: CorporateRole;
  assignedBricks: string[];
  department: string;
  createdAt: string;
  lastLoginAt: string;
}

interface StoredAccount {
  email: string;
  displayName: string;
  passwordHash: string;
  role: CorporateRole;
  assignedBricks: string[];
  department: string;
  createdAt: string;
  lastLoginAt: string;
}

interface PendingPasscode {
  email: string;
  code: string;
  expiresAt: number;
}

const USERS_STORAGE_KEY = "eva_corporate_registered_users_v1";
const SESSION_STORAGE_KEY = "eva_corporate_active_session_v1";

// Simple SHA-256 password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_eva_pharma_salt_2026");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return "hash_" + Math.abs(hash).toString(16);
}

class CorporateAuthService {
  private currentUser: CorporateUser | null = null;
  private listeners: ((user: CorporateUser | null) => void)[] = [];
  private pendingPasscodes: Map<string, PendingPasscode> = new Map();

  constructor() {
    this.cleanLegacyAzureStorage();
    this.loadSession();
  }

  private cleanLegacyAzureStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("eva_ms_user_session_v1");
      localStorage.removeItem("eva_ms_user_session");
      localStorage.removeItem("eva_ms_user");
      localStorage.removeItem("eva_ms_client_id_override");
      sessionStorage.removeItem("eva_ms_session_active");
    } catch {
      // Ignore
    }
  }

  private loadSession() {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      } else {
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): CorporateUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(callback: (user: CorporateUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  // Registered Accounts DB in LocalStorage
  private getRegisteredAccounts(): StoredAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveRegisteredAccounts(accounts: StoredAccount[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
  }

  /**
   * Check if a corporate email has already registered and set a password
   */
  public isEmailRegistered(email: string): boolean {
    const clean = email.trim().toLowerCase();
    const accounts = this.getRegisteredAccounts();
    return accounts.some((a) => a.email === clean);
  }

  /**
   * Format display name from corporate email
   * e.g. "hady.mohamed@evapharma.com" -> "Hady Mohamed"
   */
  public extractDisplayName(email: string): string {
    const namePart = email.split("@")[0] || "User";
    return namePart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Generate and send 6-digit passcode to corporate email
   * Enforces @evapharma.com domain and dispatches via configured email delivery service
   */
  public async sendEmailPasscode(
    email: string
  ): Promise<{ success: boolean; email: string; provider: string; message: string }> {
    const clean = email.trim().toLowerCase();

    if (!clean.endsWith("@evapharma.com")) {
      throw new Error("Access Denied: Only official corporate emails ending with @evapharma.com are authorized.");
    }

    // Generate random 6-digit numeric passcode
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    this.pendingPasscodes.set(clean, {
      email: clean,
      code,
      expiresAt,
    });

    const recipientName = this.extractDisplayName(clean);

    // Dispatch email directly to the recipient's inbox
    const dispatchResult = await emailDeliveryService.sendPasscode({
      toEmail: clean,
      recipientName,
      passcode: code,
    });

    return {
      success: true,
      email: clean,
      provider: dispatchResult.provider,
      message: dispatchResult.message,
    };
  }

  /**
   * Verify the 6-digit passcode sent to the email
   */
  public verifyPasscode(email: string, code: string): boolean {
    const clean = email.trim().toLowerCase();
    const pending = this.pendingPasscodes.get(clean);

    if (!pending) {
      throw new Error("No passcode was requested for this email, or the code has expired. Please request a new code.");
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingPasscodes.delete(clean);
      throw new Error("The passcode has expired. Please request a new passcode.");
    }

    if (pending.code.trim() !== code.trim()) {
      throw new Error("Invalid passcode. Please enter the exact 6 digits sent to your email.");
    }

    // Passcode verified! Remove it so it cannot be reused
    this.pendingPasscodes.delete(clean);
    return true;
  }

  /**
   * Set password for account (first time setup or password reset) and save account
   */
  public async setAccountPassword(
    email: string,
    password: string,
    role: CorporateRole = "Medical Rep",
    assignedBricks: string[] = []
  ): Promise<CorporateUser> {
    const clean = email.trim().toLowerCase();

    if (!clean.endsWith("@evapharma.com")) {
      throw new Error("Only corporate emails ending with @evapharma.com can register.");
    }

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const hashed = await hashPassword(password);
    const displayName = this.extractDisplayName(clean);
    const accounts = this.getRegisteredAccounts();
    const existingIndex = accounts.findIndex((a) => a.email === clean);

    const now = new Date().toISOString();
    const determinedRole: CorporateRole = clean.includes("admin") ? "Program Administrator" : role;

    const updatedAccount: StoredAccount = {
      email: clean,
      displayName,
      passwordHash: hashed,
      role: determinedRole,
      assignedBricks: Array.isArray(assignedBricks) ? assignedBricks : [],
      department: "EVA Insulin Pen Program",
      createdAt: existingIndex !== -1 ? accounts[existingIndex].createdAt : now,
      lastLoginAt: now,
    };

    if (existingIndex !== -1) {
      accounts[existingIndex] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }

    this.saveRegisteredAccounts(accounts);

    // Auto-login after password setup
    const user: CorporateUser = {
      id: `usr-${clean.replace(/[^a-zA-Z0-9]/g, "_")}`,
      email: updatedAccount.email,
      displayName: updatedAccount.displayName,
      role: updatedAccount.role,
      assignedBricks: updatedAccount.assignedBricks,
      department: updatedAccount.department,
      createdAt: updatedAccount.createdAt,
      lastLoginAt: updatedAccount.lastLoginAt,
    };

    this.setSession(user);
    return user;
  }

  /**
   * Update User Role and Assigned Bricks
   */
  public updateUserRoleAndBricks(
    email: string,
    role: CorporateRole,
    assignedBricks: string[]
  ): CorporateUser {
    const clean = email.trim().toLowerCase();
    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex((a) => a.email === clean);

    const cleanBricks = Array.isArray(assignedBricks) ? assignedBricks : [];

    if (idx !== -1) {
      accounts[idx].role = role;
      accounts[idx].assignedBricks = cleanBricks;
      this.saveRegisteredAccounts(accounts);
    }

    const updatedUser: CorporateUser = {
      id: `usr-${clean.replace(/[^a-zA-Z0-9]/g, "_")}`,
      email: clean,
      displayName: this.extractDisplayName(clean),
      role,
      assignedBricks: cleanBricks,
      department: "EVA Insulin Pen Program",
      createdAt: idx !== -1 ? accounts[idx].createdAt : new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.setSession(updatedUser);
    return updatedUser;
  }

  /**
   * Regular Login with Email & Password
   */
  public async loginWithPassword(email: string, password: string): Promise<CorporateUser> {
    const clean = email.trim().toLowerCase();

    if (!clean.endsWith("@evapharma.com")) {
      throw new Error("Only corporate emails ending with @evapharma.com are authorized.");
    }

    const accounts = this.getRegisteredAccounts();
    const account = accounts.find((a) => a.email === clean);

    if (!account) {
      throw new Error("This corporate email is not registered yet. Please click 'Get Email Passcode' to set up your account.");
    }

    const hashed = await hashPassword(password);
    if (account.passwordHash !== hashed) {
      throw new Error("Incorrect password. Please try again or request an email passcode to reset it.");
    }

    // Update last login
    account.lastLoginAt = new Date().toISOString();
    this.saveRegisteredAccounts(accounts);

    const user: CorporateUser = {
      id: `usr-${clean.replace(/[^a-zA-Z0-9]/g, "_")}`,
      email: account.email,
      displayName: account.displayName,
      role: account.role || "Medical Rep",
      assignedBricks: Array.isArray(account.assignedBricks) ? account.assignedBricks : [],
      department: account.department,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };

    this.setSession(user);
    return user;
  }

  public signOut(): void {
    this.currentUser = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    this.notify();
  }

  private setSession(user: CorporateUser) {
    this.currentUser = user;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
    this.notify();
  }
}

export const corporateAuthService = new CorporateAuthService();
