import React, { useState } from "react";
import {
  corporateAuthService,
  type CorporateUser,
  type CorporateRole,
} from "@/lib/corporate-auth.service";
import { TerritorySelectionDialog } from "./TerritorySelectionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import systemLogo from "@/assets/system-logo.jpg";
import { toast } from "sonner";
import {
  Building2,
  Lock,
  ArrowRight,
  AlertCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  ShieldCheck,
  Check,
} from "lucide-react";

interface CorporateLoginScreenProps {
  onSuccess: (user: CorporateUser) => void;
  onOpenPharmacyPortal: () => void;
}

type AuthStep = "LOGIN_PASSWORD" | "REQUEST_PASSCODE" | "VERIFY_PASSCODE" | "SET_NEW_PASSWORD";

export function CorporateLoginScreen({
  onSuccess,
  onOpenPharmacyPortal,
}: CorporateLoginScreenProps) {
  const [step, setStep] = useState<AuthStep>("LOGIN_PASSWORD");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passcode, setPasscode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Territory Selection Modal State
  const [showTerritoryDialog, setShowTerritoryDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<CorporateUser | null>(null);

  // Email Dispatch Status
  const [dispatchInfo, setDispatchInfo] = useState<{ provider: string; message: string } | null>(null);

  // 1. Handle Login with Saved Password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@evapharma.com")) {
      setError("Access Restricted: Only official corporate emails ending with @evapharma.com are authorized.");
      return;
    }

    if (!password) {
      setError("Please enter your account password");
      return;
    }

    setLoading(true);
    try {
      const user = await corporateAuthService.loginWithPassword(cleanEmail, password);
      if (
        (!user.assignedBricks || user.assignedBricks.length === 0) &&
        user.role !== "Program Administrator"
      ) {
        setPendingUser(user);
        setShowTerritoryDialog(true);
        return;
      }
      toast.success(`Welcome back, ${user.displayName}`);
      onSuccess(user);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // 2. Request 6-Digit Passcode to Corporate Email
  const handleRequestPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@evapharma.com")) {
      setError("Access Restricted: Email must end with @evapharma.com");
      return;
    }

    setLoading(true);
    try {
      const res = await corporateAuthService.sendEmailPasscode(cleanEmail);
      setDispatchInfo({ provider: res.provider, message: res.message });
      setPasscode("");
      setStep("VERIFY_PASSCODE");
      toast.success(`Verification passcode sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err?.message || "Failed to generate passcode.");
      toast.error(err?.message || "Error sending code");
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify Passcode
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passcode.length !== 6) {
      setError("Please enter the 6-digit passcode sent to your email.");
      return;
    }

    try {
      corporateAuthService.verifyPasscode(email, passcode);
      toast.success("Passcode verified successfully! Please set your new password.");
      setStep("SET_NEW_PASSWORD");
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired passcode.");
      toast.error(err?.message || "Verification failed");
    }
  };

  // 4. Save New Password & Proceed to Role & Territory Selection
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    // Passwords match! Now open the Egypt Bricks & Role selector
    setShowTerritoryDialog(true);
  };

  const handleTerritorySaved = async (selectedRole: CorporateRole, assignedBricks: string[]) => {
    setLoading(true);
    try {
      if (step === "SET_NEW_PASSWORD") {
        const user = await corporateAuthService.setAccountPassword(
          email,
          newPassword,
          selectedRole,
          assignedBricks
        );
        setShowTerritoryDialog(false);
        toast.success(`Welcome to EVA Pen Program, ${user.displayName}`);
        onSuccess(user);
      } else if (pendingUser) {
        const user = corporateAuthService.updateUserRoleAndBricks(
          pendingUser.email,
          selectedRole,
          assignedBricks
        );
        setShowTerritoryDialog(false);
        toast.success(`Welcome back, ${user.displayName}`);
        onSuccess(user);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background flex flex-col justify-between p-4 sm:p-6" dir="ltr">
      {/* Top Bar with Link to Separate Pharmacy Station */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 font-bold">
            EVA Pharma Corporate
          </Badge>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Internal Staff & Medical Rep Authentication
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPharmacyPortal}
          className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Building2 className="size-3.5 text-primary" />
          <span>Pharmacy & Clinic Station</span>
          <ArrowRight className="size-3" />
        </Button>
      </div>

      {/* Main Center Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="text-center space-y-3 mb-5">
          <div className="mx-auto flex items-center justify-center">
            <img
              src={systemLogo}
              alt="EVA Insulin Pen Program"
              className="max-h-20 w-auto object-contain drop-shadow-sm"
            />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Pen Program Management Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Secure corporate authentication for EVA Pharma medical staff.
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-xl space-y-5">
          {/* Header Title based on Step */}
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              {step === "LOGIN_PASSWORD"
                ? "Corporate Staff Login"
                : step === "REQUEST_PASSCODE"
                ? "Send Email Passcode"
                : step === "VERIFY_PASSCODE"
                ? "Enter 6-Digit Passcode"
                : "Create Account Password"}
            </span>
            <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-bold">
              @evapharma.com Only
            </Badge>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="size-4 shrink-0" />
                <span>Authentication Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed">{error}</p>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 1: LOGIN WITH SAVED PASSWORD                              */}
          {/* ============================================================== */}
          {step === "LOGIN_PASSWORD" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Corporate Email Address *
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="your.name@evapharma.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    required
                    autoFocus
                    className="text-xs pl-8 font-mono h-11"
                  />
                  <Mail className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Account Password *
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("REQUEST_PASSCODE");
                      setError(null);
                    }}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    required
                    className="text-xs pl-8 pr-9 font-mono h-11 tracking-wider"
                  />
                  <KeyRound className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer"
              >
                <Lock className="size-4" />
                {loading ? "Authenticating..." : "Sign In to Pen Program"}
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setStep("REQUEST_PASSCODE");
                    setError(null);
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  First time signing in? Click to get an email passcode ➔
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: REQUEST PASSCODE (FIRST TIME OR FORGOT PASSWORD)       */}
          {/* ============================================================== */}
          {step === "REQUEST_PASSCODE" && (
            <form onSubmit={handleRequestPasscode} className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Send className="size-3.5 text-primary" />
                  Email Verification Code:
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your official EVA Pharma email. A 6-digit entry passcode will be sent to your email to verify your identity and let you set your password.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Corporate Email Address *
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="your.name@evapharma.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    required
                    autoFocus
                    className="text-xs pl-8 font-mono h-11"
                  />
                  <Mail className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer"
              >
                <Send className="size-4" />
                {loading ? "Sending Passcode..." : "Send Passcode to Corporate Email"}
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setStep("LOGIN_PASSWORD");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  ← Back to Login with Password
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 3: VERIFY 6-DIGIT PASSCODE                                */}
          {/* ============================================================== */}
          {step === "VERIFY_PASSCODE" && (
            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              {/* Secure Corporate Email Passcode Sent Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="size-4 text-primary" />
                    Passcode Sent to Corporate Inbox
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                    Outlook / Exchange
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A 6-digit confidential entry code has been dispatched to <strong className="text-foreground font-mono">{email}</strong>.
                  Please open your official Outlook / Exchange mailbox and copy the passcode.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                  <span>Confidential security code. Valid for 10 minutes.</span>
                </div>
              </div>

              {dispatchInfo?.provider === "unconfigured" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>Email Gateway Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    No active email API key (Brevo / EmailJS / Resend) is configured in <code className="font-mono bg-amber-500/20 px-1 rounded">.env</code> yet. Please configure an email delivery provider to deliver directly to the corporate mailbox.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Enter 6-Digit Passcode *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {email}
                  </span>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  required
                  autoFocus
                  className="text-center text-3xl font-mono tracking-widest font-black h-13 bg-muted/20"
                />
              </div>

              <Button
                type="submit"
                disabled={passcode.length !== 6}
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                Verify Passcode & Set Password
              </Button>

              <div className="pt-2 flex items-center justify-between text-xs border-t">
                <button
                  type="button"
                  onClick={handleRequestPasscode}
                  disabled={loading}
                  className="text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Resend Passcode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("LOGIN_PASSWORD");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 4: SET NEW SECURE PASSWORD                                */}
          {/* ============================================================== */}
          {step === "SET_NEW_PASSWORD" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <Check className="size-4 text-emerald-600" />
                  <span>Identity Verified!</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your corporate email <strong>{email}</strong> has been confirmed. Now create a secure password to use for all your future logins.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  New Account Password (Min. 6 characters) *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="text-xs pl-8 pr-9 font-mono h-11 tracking-wider"
                  />
                  <KeyRound className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-xs pl-8 font-mono h-11 tracking-wider"
                  />
                  <KeyRound className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || newPassword.length < 6}
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-4" />
                {loading ? "Processing..." : "Continue to Select Role & Bricks ➔"}
              </Button>
            </form>
          )}

          {/* Bottom Security Notice */}
          <div className="pt-2 border-t text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Encrypted Passwords • EVA Pharma Corporate Governance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Territory & Role Selection Dialog */}
      <TerritorySelectionDialog
        open={showTerritoryDialog}
        onOpenChange={setShowTerritoryDialog}
        userEmail={email || pendingUser?.email || ""}
        userName={pendingUser?.displayName || email.split("@")[0] || ""}
        initialRole={pendingUser?.role || "Medical Rep"}
        initialBricks={pendingUser?.assignedBricks || []}
        isFirstTime={step === "SET_NEW_PASSWORD" || !pendingUser?.assignedBricks?.length}
        onSave={handleTerritorySaved}
      />

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-muted-foreground py-2">
        <p>© {new Date().getFullYear()} EVA Pharma — Insulin Pen Patient Support Program.</p>
      </div>
    </div>
  );
}
