import React, { useState, useEffect, useCallback } from "react";
import { penService } from "@/lib/onedrive-pen.service";
import {
  INSULIN_PRODUCTS,
  type EnrolledAccount,
  type DispenseRecord,
  type DispenseException,
} from "@/types/pen-program.types";
import { DispenseFormModal } from "./DispenseFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import systemLogo from "@/assets/system-logo.jpg";
import {
  Syringe,
  LogIn,
  LogOut,
  Stethoscope,
  Store,
  Building2,
  Package,
  Plus,
  AlertTriangle,
  History,
  CheckCircle2,
  Send,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Lock,
} from "lucide-react";

export function DispensePortalView() {
  const [account, setAccount] = useState<EnrolledAccount | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("dispense_portal_account_id");
    if (saved) {
      void penService.getAccountById(saved).then((acc) => {
        if (acc) setAccount(acc);
      });
    }
  }, []);

  const handleLogin = (acc: EnrolledAccount) => {
    setAccount(acc);
    sessionStorage.setItem("dispense_portal_account_id", acc.account_id);
  };

  const handleLogout = () => {
    setAccount(null);
    sessionStorage.removeItem("dispense_portal_account_id");
  };

  if (!account) {
    return <PortalPinLogin onLogin={handleLogin} />;
  }

  return <PortalDashboard account={account} onLogout={handleLogout} />;
}

/* ------------------------------------------------------------------ */
/*  PIN Login Screen                                                   */
/* ------------------------------------------------------------------ */
function PortalPinLogin({ onLogin }: { onLogin: (acc: EnrolledAccount) => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError("برجاء إدخال كود الـ PIN المكوّن من 6 أرقام");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const acc = await penService.authenticateByPin(pin);
      if (!acc) {
        setError("كود PIN غير صحيح أو أن حساب الجهة غير مفعل حالياً");
        toast.error("فشل التحقق: كود PIN غير صحيح");
        return;
      }
      toast.success(`مرحباً بك، ${acc.account_name}`);
      onLogin(acc);
    } catch {
      setError("حدث خطأ أثناء التحقق. برجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and title */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center">
            <img
              src={systemLogo}
              alt="EVA Insulin Pen Program"
              className="max-h-20 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <div>
            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 bg-primary/5 mb-1.5">
              محطة صرف أقلام الأنسولين
            </Badge>
            <h1 className="text-xl font-black text-foreground tracking-tight">بوابة صرف الصيدليات والعيادات</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              أدخل كود الـ PIN المكوّن من 6 أرقام المعتمد لمنشأتك لبدء صرف أقلام الأنسولين وفحص سقف المريض ومتابعة الرصيد المتاح.
            </p>
          </div>
        </div>

        {/* PIN Card */}
        <div className="p-6 sm:p-7 rounded-2xl border bg-card shadow-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground text-center block">
                كود PIN الخاص بالجهة (6 أرقام)
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  placeholder="••••••"
                  autoFocus
                  className="text-center text-3xl font-mono tracking-widest font-black h-14 bg-muted/20 border-2 focus-visible:border-primary"
                  dir="ltr"
                />
                <Lock className="size-4 text-muted-foreground/60 absolute left-4 top-5 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center flex items-center justify-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full font-bold h-11 text-xs sm:text-sm gap-2 shadow-sm"
            >
              <LogIn className="size-4" />
              {loading ? "جاري التحقق من الـ PIN..." : "تسجيل الدخول لمحطة الصرف"}
            </Button>
          </form>

          <div className="pt-3 border-t text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              ليس لديك كود PIN الخاص بمنشأتك بعد؟
            </p>
            <p className="text-[11px] text-primary font-medium leading-relaxed">
              برجاء التواصل مع مندوب دعاية إيفا فارما المسؤول عن منطقتك للحصول على كود الدخول.
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>نظام تدقيق مشفر لبيانات المرضى • سحابة Microsoft 365</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Portal Dashboard                                                   */
/* ------------------------------------------------------------------ */
function PortalDashboard({
  account: initialAccount,
  onLogout,
}: {
  account: EnrolledAccount;
  onLogout: () => void;
}) {
  const [account, setAccount] = useState<EnrolledAccount>(initialAccount);
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);
  const [exceptions, setExceptions] = useState<DispenseException[]>([]);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);

  // Forms inside modals
  const [requestedQty, setRequestedQty] = useState(20);
  const [stockNotes, setStockNotes] = useState("");
  const [submittingStock, setSubmittingStock] = useState(false);

  // Exception Form
  const [exceptionPatientName, setExceptionPatientName] = useState("");
  const [exceptionPhone, setExceptionPhone] = useState("");
  const [exceptionNationalId, setExceptionNationalId] = useState("");
  const [exceptionProduct, setExceptionProduct] = useState<string>(INSULIN_PRODUCTS[0]);
  const [exceptionPensCount, setExceptionPensCount] = useState(1);
  const [exceptionReason, setExceptionReason] = useState("");
  const [submittingException, setSubmittingException] = useState(false);

  // Fulfilling exception loader
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const refreshAccountData = useCallback(async () => {
    const updated = await penService.getAccountById(account.account_id);
    if (updated) setAccount(updated);

    const [allDisps, allExcs] = await Promise.all([
      penService.getDispenses(),
      penService.getExceptions(),
    ]);

    setDispenses(allDisps.filter((d) => d.account_id === account.account_id));
    setExceptions(allExcs.filter((e) => e.account_id === account.account_id));
  }, [account.account_id]);

  useEffect(() => {
    void refreshAccountData();
  }, [refreshAccountData]);

  // Approved Exceptions waiting to be dispensed
  const approvedExceptions = exceptions.filter((e) => e.admin_status === "approved");

  // Fulfill approved exception handler
  const handleFulfillException = async (exc: DispenseException) => {
    if (account.current_balance < exc.pens_count) {
      toast.error(`رصيد الأقلام المتاح (${account.current_balance} قلم) غير كافٍ لصرف هذا الاستثناء`);
      return;
    }

    setFulfillingId(exc.exception_id);
    try {
      await penService.fulfillApprovedException(exc.exception_id);
      toast.success(`تم صرف الاستثناء المعتمد للمريض ${exc.patient_name} بنجاح!`);
      void refreshAccountData();
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء صرف الاستثناء");
    } finally {
      setFulfillingId(null);
    }
  };

  // Request Stock
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStock(true);
    try {
      await penService.requestStock({
        account_id: account.account_id,
        account_name: account.account_name,
        account_type: account.account_type,
        requested_by: account.account_name,
        requested_qty: requestedQty,
        notes: stockNotes,
      });
      toast.success("تم إرسال طلب توريد رصيد أقلام إضافي للإدارة بنجاح");
      setIsStockModalOpen(false);
      setStockNotes("");
    } catch {
      toast.error("فشل في إرسال طلب التوريد");
    } finally {
      setSubmittingStock(false);
    }
  };

  // Request Exception
  const handleExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionPhone.trim() || !exceptionReason.trim() || !exceptionPatientName.trim()) {
      toast.error("برجاء استيفاء جميع الحقول الإلزامية");
      return;
    }
    setSubmittingException(true);
    try {
      await penService.requestException({
        account_id: account.account_id,
        account_name: account.account_name,
        account_type: account.account_type,
        patient_name: exceptionPatientName.trim(),
        patient_phone: exceptionPhone.trim(),
        national_id: exceptionNationalId.trim(),
        prescribing_doctor: account.account_type === "private_clinic" ? account.account_name : "طبيب معتمد",
        product_name: exceptionProduct,
        pens_count: exceptionPensCount,
        exception_reason: exceptionReason.trim(),
      });
      toast.success("تم إرسال طلب الاستثناء لإدارة البرنامج للمراجعة والاعتماد");
      setIsExceptionModalOpen(false);
      setExceptionPatientName("");
      setExceptionPhone("");
      setExceptionNationalId("");
      setExceptionReason("");
      void refreshAccountData();
    } catch {
      toast.error("فشل في إرسال طلب الاستثناء");
    } finally {
      setSubmittingException(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" dir="rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-2xl border bg-card/80 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {account.account_type === "private_clinic" ? (
              <Stethoscope className="size-6" />
            ) : account.account_type === "pharmacy" ? (
              <Store className="size-6" />
            ) : (
              <Building2 className="size-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{account.account_name}</h2>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                {account.account_type === "private_clinic"
                  ? account.specialty || "عيادة خاصة"
                  : account.account_type === "pharmacy"
                  ? "صيدلية معتمدة"
                  : "مركز طبي"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.territory} • الهاتف: <span className="font-mono" dir="ltr">{account.phone}</span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          تسجيل الخروج
        </Button>
      </div>

      {/* Hero Balance & Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Balance Card */}
        <div className="p-4 rounded-2xl border bg-card space-y-1 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-muted-foreground">الرصيد المتاح للصرف</span>
            <Package className="size-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-primary pt-1 font-mono">
            {account.current_balance} <span className="text-sm font-bold text-muted-foreground">قلم</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            من إجمالي حصة معتمدة {account.allocated_pens} قلم
          </p>
        </div>

        {/* Dispensed Card */}
        <div className="p-4 rounded-2xl border bg-card space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-muted-foreground">إجمالي المنصرف للمرضى</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 pt-1 font-mono">
            {account.dispensed_count} <span className="text-sm font-bold text-muted-foreground">قلم</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            مسجلة بروشتة معتمدة ورقم قومي
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-xs font-bold text-foreground block">صرف قلم أنسولين لمريض</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              فحص فوري لسقف وتكرار المريض وتصوير الروشتة
            </p>
          </div>
          <Button
            onClick={() => setIsDispenseModalOpen(true)}
            disabled={account.current_balance === 0}
            className="w-full font-bold gap-2 text-xs h-9 shadow-sm"
          >
            <Plus className="size-4" />
            صرف قلم الآن
          </Button>
        </div>
      </div>

      {/* APPROVED EXCEPTIONS READY TO BE DISPENSED */}
      {approvedExceptions.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                الاستثناءات المعتمدة الجاهزة للصرف ({approvedExceptions.length})
              </h3>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
              يمكنك صرف هذه الأقلام المعتمدة فوراً بنقرة واحدة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {approvedExceptions.map((exc) => (
              <div
                key={exc.exception_id}
                className="p-3 rounded-xl bg-background border border-emerald-500/20 shadow-xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">{exc.patient_name}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">
                      معتمد ({exc.pens_count} قلم)
                    </Badge>
                  </div>
                  <span className="text-[11px] text-primary font-semibold block mt-0.5">
                    {exc.product_name}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    الهاتف: <span className="font-mono" dir="ltr">{exc.patient_phone}</span> • السبب: {exc.exception_reason}
                  </p>
                  {exc.admin_notes && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                      ملاحظة الإدارة: {exc.admin_notes}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleFulfillException(exc)}
                  disabled={fulfillingId === exc.exception_id || account.current_balance < exc.pens_count}
                  className="w-full text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="size-3.5" />
                  {fulfillingId === exc.exception_id ? "جاري الصرف..." : "صرف القلم المعتمد الآن"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Actions: Request Stock & Exception */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsStockModalOpen(true)}
          className="text-xs font-semibold gap-1.5 h-8 border-border"
        >
          <Package className="size-3.5 text-primary" />
          طلب توريد رصيد أقلام إضافي
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExceptionModalOpen(true)}
          className="text-xs font-semibold gap-1.5 h-8 border-border text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="size-3.5" />
          تقديم طلب استثناء لمريض
        </Button>
      </div>

      {/* Recent Dispenses History */}
      <div className="p-4 rounded-2xl border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-primary" />
            سجلات الصرف الأخيرة في منشأتك
          </h3>
          <span className="text-[10px] text-muted-foreground">{dispenses.length} عملية مسجلة</span>
        </div>

        {dispenses.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed bg-muted/20 space-y-1">
            <Syringe className="size-7 mx-auto text-muted-foreground/60" />
            <p className="text-xs font-semibold text-foreground">لم يتم تسجيل أي عمليات صرف في منشأتك حتى الآن</p>
            <p className="text-[10px] text-muted-foreground">
              اضغط على زر "صرف قلم الآن" أعلاه لتسجيل أول عملية صرف لمريض.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-2">كود السجل</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">اسم المريض</th>
                  <th className="p-2">رقم الهاتف</th>
                  <th className="p-2">الرقم القومي</th>
                  <th className="p-2">صنف الأنسولين</th>
                  <th className="p-2 text-center">الكمية</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispenses.map((d) => (
                  <tr key={d.record_id} className="hover:bg-muted/20 transition">
                    <td className="p-2 font-mono font-bold text-primary" dir="ltr">{d.record_id}</td>
                    <td className="p-2 text-muted-foreground" dir="ltr">
                      {new Date(d.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="p-2 font-medium">{d.patient_name}</td>
                    <td className="p-2 font-mono" dir="ltr">{d.patient_phone}</td>
                    <td className="p-2 font-mono text-muted-foreground" dir="ltr">{d.national_id}</td>
                    <td className="p-2 font-medium text-primary">{d.product_name || "جلارجيفين (Glargivin)"}</td>
                    <td className="p-2 text-center">
                      <Badge className="font-bold text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {d.dispensed_qty} قلم
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispense Modal */}
      {isDispenseModalOpen && (
        <DispenseFormModal
          open={isDispenseModalOpen}
          onOpenChange={setIsDispenseModalOpen}
          onSuccess={() => {
            void refreshAccountData();
          }}
          account={account}
          recordedBy={`بوابة الصيدليات (${account.account_name})`}
        />
      )}

      {/* Stock Request Modal */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-md p-5" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="size-5 text-primary" /> طلب توريد رصيد أقلام إضافي
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              تقديم طلب رسمي لإدارة برنامج EVA Pharma لتوريد دفعة أقلام جديدة لمنشأة {account.account_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStockSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">الكمية المطلوبة من الأقلام *</Label>
              <Input
                type="number"
                min={5}
                max={200}
                value={requestedQty}
                onChange={(e) => setRequestedQty(parseInt(e.target.value) || 5)}
                required
                className="text-xs font-bold"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">ملاحظات / أسباب طلب التوريد</Label>
              <Textarea
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="مثال: زيادة إقبال المرضى واقتراب نفاذ الرصيد الحالي المتاح..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingStock}
              className="w-full font-bold gap-2 text-xs h-10 shadow-sm"
            >
              <Send className="size-4" />
              {submittingStock ? "جاري إرسال الطلب..." : "إرسال طلب التوريد"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exception Request Modal */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="sm:max-w-md p-5" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> طلب استثناء علاجي لمريض
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              تقديم طلب استثناء لحالات طبية خاصة أو تكرار الصرف المبكر.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExceptionSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">اسم المريض بالكامل *</Label>
              <Input
                value={exceptionPatientName}
                onChange={(e) => setExceptionPatientName(e.target.value)}
                placeholder="مثال: أحمد حسن محمد"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">رقم الهاتف المحمول *</Label>
                <Input
                  value={exceptionPhone}
                  onChange={(e) => setExceptionPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  className="text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">الرقم القومي (14 رقم)</Label>
                <Input
                  value={exceptionNationalId}
                  onChange={(e) => setExceptionNationalId(e.target.value.replace(/\D/g, "").slice(0, 14))}
                  placeholder="290XXXXXXXXXXX"
                  maxLength={14}
                  className="text-xs text-center font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">صنف الأنسولين *</Label>
                <div className="relative">
                  <select
                    value={exceptionProduct}
                    onChange={(e) => setExceptionProduct(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border bg-background font-semibold appearance-none pl-6 text-right"
                    required
                  >
                    {INSULIN_PRODUCTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="size-3.5 text-muted-foreground absolute left-2 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">عدد الأقلام</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={exceptionPensCount}
                  onChange={(e) => setExceptionPensCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs font-bold"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">المبرر والسبب الطبي للاستثناء *</Label>
              <Textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="وضح حالة المريض الطبية ومبرر طلب الاستثناء..."
                rows={2}
                required
                className="text-xs resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingException}
              className="w-full font-bold gap-2 text-xs h-9 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="size-4" />
              {submittingException ? "جاري الإرسال..." : "إرسال طلب الاستثناء للإدارة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
