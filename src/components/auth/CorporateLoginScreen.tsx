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
  Check,
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
      setError("يرجى إدخال كلمة المرور");
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
      toast.success(`مرحباً بك مجدداً، ${user.displayName}`);
      onSuccess(user);
    } catch (err: any) {
      setError(err?.message || "بيانات الدخول غير صحيحة");
      toast.error(err?.message || "فشل تسجيل الدخول");
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
      setError("البريد الإلكتروني يجب أن ينتهي بـ @evapharma.com حصراً.");
      return;
    }

    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين. يرجى إعادة التأكد.");
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
        toast.success(`تم إنشاء الحساب بنجاح! أهلاً بك يا ${user.displayName}`);
        onSuccess(user);
      } else if (pendingUser) {
        const user = await corporateAuthService.updateUserRoleAndBricks(
          pendingUser.email,
          selectedRole,
          assignedBricks
        );
        setShowTerritoryDialog(false);
        toast.success(`تم تحديث الصلاحيات والمناطق بنجاح! مرحباً بك يا ${user.displayName}`);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ الحساب");
      toast.error(err?.message || "فشل حفظ الحساب");
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
      setError("البريد الإلكتروني يجب أن ينتهي بـ @evapharma.com");
      return;
    }

    if (!password || password.length < 6) {
      setError("كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      await corporateAuthService.resetPasswordDirect(cleanEmail, password);
      toast.success("تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول مباشرة.");
      setMode("LOGIN");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "فشل تحديث كلمة المرور");
      toast.error(err?.message || "خطأ");
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
            Medical Reps & District Managers Portal
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
              بوابة مندوبي الدعاية ومديري المناطق لمتابعة الصيدليات وأقلام الأنسولين
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-xl space-y-5">
          {/* Header Title & Mode Switcher */}
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              {mode === "LOGIN"
                ? "تسجيل دخول الموظفين"
                : mode === "REGISTER"
                ? "تسجيل حساب جديد (MR / DM)"
                : "إعادة تعيين كلمة المرور"}
            </span>
            <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-bold">
              @evapharma.com Only
            </Badge>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all text-center ${
                mode === "LOGIN"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all text-center ${
                mode === "REGISTER"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              حساب جديد (تسجيل أول مرة)
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="size-4 shrink-0" />
                <span>تنبيه الدخول</span>
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
                  البريد الإلكتروني للشركة (@evapharma.com) *
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
                    كلمة المرور *
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("RESET_PASSWORD");
                      setError(null);
                    }}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    نسيت كلمة المرور؟
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
                {loading ? "جاري التحقق من الحساب..." : "تسجيل الدخول للمنظومة"}
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMode("REGISTER");
                    setError(null);
                  }}
                  className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <UserPlus className="size-3.5" />
                  <span>أول مرة تسجل دخولك؟ اضغط لإنشاء حسابك وتحديد منطقتك ➔</span>
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
                  تسجيل حساب جديد لمندوبي ومديري إيفا فارما:
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  أدخل بريدك الرسمي وكلمة المرور، ثم ستختار وظيفتك (MR أو DM) وتحدد مناطق عملك (Bricks) المسئول عنها لتظهر لك وحدك.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  البريد الإلكتروني الرسمي (@evapharma.com) *
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
                  الاسم الكامل (اختياري)
                </Label>
                <Input
                  type="text"
                  placeholder="مثال: د. أحمد محمد"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    كلمة المرور (6+ خانات) *
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
                      className="absolute right-2 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    تأكيد كلمة المرور *
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
                <span>متابعة لاختيار الرتبة والمناطق (Bricks) ➔</span>
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  ← لديك حساب بالفعل؟ العودة لتسجيل الدخول
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
                  إعادة تعيين كلمة المرور:
                </span>
                <p className="text-[11px] leading-relaxed">
                  أدخل بريدك الرسمي المسجل مسبقاً، واكتب كلمة المرور الجديدة لتحديثها فوراً.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  البريد الإلكتروني الرسمي (@evapharma.com) *
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
                  كلمة المرور الجديدة *
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
                    className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  تأكيد كلمة المرور الجديدة *
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
                {loading ? "جاري التحديث..." : "تحديث كلمة المرور والدخول"}
              </Button>

              <div className="pt-2 text-center border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  ← العودة لشاشة تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* Bottom Security Notice */}
          <div className="pt-2 border-t text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>قاعدة بيانات سحابية مركزية (Supabase) • تشفير آمن لكلمات المرور</span>
            </div>
          </div>
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
