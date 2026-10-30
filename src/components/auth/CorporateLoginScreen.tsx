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
  UserPlus,
  ShieldCheck,
  MapPin,
  RotateCcw,
} from "lucide-react";

interface CorporateLoginScreenProps {
  onSuccess: (user: CorporateUser) => void;
  onOpenPharmacyPortal: () => void;
}

type AuthMode = "LOGIN" | "REGISTER" | "RESET_PASSWORD";

export function CorporateLoginScreen({
  onSuccess,
  onOpenPharmacyPortal,
}: CorporateLoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [customName, setCustomName] = useState("");

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Territory Selection Modal State
  const [showTerritoryDialog, setShowTerritoryDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<CorporateUser | null>(null);

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
      setError("Please enter your account password.");
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

  // 2. Initiate Registration: Validate and open Territory & Role Selection
  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@evapharma.com")) {
      setError("Corporate email must end with @evapharma.com.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    // Open Territory Selection Dialog to pick role (DM / MR) and Egypt Bricks
    setShowTerritoryDialog(true);
  };

  // 3. Handle Territory & Role Saved -> Register into Supabase Database
  const handleTerritorySaved = async (selectedRole: CorporateRole, assignedBricks: string[]) => {
    setLoading(true);
    try {
      if (mode === "REGISTER") {
        const user = await corporateAuthService.registerAccount(
          email,
          password,
          selectedRole,
          assignedBricks,
          customName
        );
        setShowTerritoryDialog(false);
        toast.success(`Account registered successfully! Welcome, ${user.displayName}`);
        onSuccess(user);
      } else if (pendingUser) {
        const user = await corporateAuthService.updateUserRoleAndBricks(
          pendingUser.email,
          selectedRole,
          assignedBricks
        );
        setShowTerritoryDialog(false);
        toast.success(`Role and territories updated! Welcome back, ${user.displayName}`);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving your account.");
      toast.error(err?.message || "Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Direct Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@evapharma.com")) {
      setError("Corporate email must end with @evapharma.com.");
      return;
    }

    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      await corporateAuthService.resetPasswordDirect(cleanEmail, password);
      toast.success("Password updated successfully! You can now sign in directly.");
      setMode("LOGIN");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
      toast.error(err?.message || "Error");
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
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPharmacyPortal}
          className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
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
          </div>
        </div>

        {/* Card Box */}
        <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-xl space-y-5">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === "LOGIN"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === "REGISTER"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New Account (Register)
            </button>
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
          {/* MODE 1: LOGIN WITH SAVED PASSWORD                              */}
          {/* ============================================================== */}
          {mode === "LOGIN" && (
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
                    Password *
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("RESET_PASSWORD");
                      setError(null);
                    }}
                    className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
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
                    className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
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
                    setMode("REGISTER");
                    setError(null);
                  }}
                  className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <UserPlus className="size-3.5" />
                  <span>First time signing in? Click here to register & assign territory ➔</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* MODE 2: REGISTER DIRECTLY WITH ROLE & BRICKS                   */}
          {/* ============================================================== */}
          {mode === "REGISTER" && (
            <form onSubmit={handleStartRegistration} className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="size-3.5 text-primary" />
                  New Account Registration (EVA Pharma Medical Staff):
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your corporate email and password. In the next step, you will choose your role (Medical Rep or District Manager) and select your assigned bricks.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Official Corporate Email *
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="name.rep@evapharma.com"
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
                <Label className="text-xs font-semibold text-foreground">
                  Full Name (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Ahmed Mohamed"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Password (Min. 6 chars) *
                  </Label>
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
                      className="text-xs pl-8 pr-9 font-mono h-10 tracking-wider"
                    />
                    <KeyRound className="size-3 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
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
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      className="text-xs pl-8 font-mono h-10 tracking-wider"
                    />
                    <KeyRound className="size-3 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <MapPin className="size-4" />
                <span>Continue to Select Role & Bricks ➔</span>
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  ← Already have an account? Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* MODE 3: RESET PASSWORD DIRECTLY                                */}
          {/* ============================================================== */}
          {mode === "RESET_PASSWORD" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <RotateCcw className="size-3.5 text-amber-600" />
                  Reset Account Password:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Enter your registered corporate email and your new password to update your account immediately.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Official Corporate Email *
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
                <Label className="text-xs font-semibold text-foreground">
                  New Password (Min. 6 chars) *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-xs pl-8 pr-9 font-mono h-11 tracking-wider"
                  />
                  <KeyRound className="size-3.5 text-muted-foreground absolute left-2.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Confirm New Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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
                disabled={loading}
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-sm cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CheckCircle2 className="size-4" />
                {loading ? "Updating Password..." : "Update Password & Sign In"}
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Territory & Role Selection Dialog */}
      <TerritorySelectionDialog
        open={showTerritoryDialog}
        onOpenChange={setShowTerritoryDialog}
        userEmail={email || pendingUser?.email || ""}
        userName={customName || pendingUser?.displayName || email.split("@")[0] || ""}
        initialRole={pendingUser?.role || "Medical Rep"}
        initialBricks={pendingUser?.assignedBricks || []}
        isFirstTime={mode === "REGISTER" || !pendingUser?.assignedBricks?.length}
        onSave={handleTerritorySaved}
      />

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-muted-foreground py-2">
        <p>© {new Date().getFullYear()} EVA Pharma — Insulin Pen Patient Support Program.</p>
      </div>
    </div>
  );
}
