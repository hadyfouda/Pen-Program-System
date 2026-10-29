import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { penService } from "@/lib/onedrive-pen.service";
import { compressImage, formatFileSize } from "@/lib/image-compress";
import {
  INSULIN_PRODUCTS,
  type EnrolledAccount,
  type DispenseRecord,
  type PatientHistoryMatch,
} from "@/types/pen-program.types";
import { toast } from "sonner";
import {
  Syringe,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  Stethoscope,
  Store,
  Building2,
  ShieldCheck,
  Send,
  ChevronDown,
} from "lucide-react";

interface DispenseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (record: DispenseRecord) => void;
  account?: EnrolledAccount | null;
  accountsList?: EnrolledAccount[];
  recordedBy?: string;
}

interface UploadedDoc {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  base64: string;
}

export function DispenseFormModal({
  open,
  onOpenChange,
  onSuccess,
  account,
  accountsList = [],
  recordedBy = "Field Rep",
}: DispenseFormModalProps) {
  const isMobile = useIsMobile();

  // Selected Account
  const [selectedAccountId, setSelectedAccountId] = useState<string>(account?.account_id || "");

  // Form Fields
  const [prescribingDoctor, setPrescribingDoctor] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [productName, setProductName] = useState<string>(INSULIN_PRODUCTS[0]);
  const [dispensedQty, setDispensedQty] = useState<number>(1);
  const [notes, setNotes] = useState("");

  // Patient History & Duplicate Detection States
  const [historyMatches, setHistoryMatches] = useState<PatientHistoryMatch[]>([]);
  const [checkingHistory, setCheckingHistory] = useState(false);

  // Exception Request Modal State
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [submittingException, setSubmittingException] = useState(false);

  // Uploaded Documents
  const [rxDoc, setRxDoc] = useState<UploadedDoc | null>(null);
  const [idDoc, setIdDoc] = useState<UploadedDoc | null>(null);
  const [consentDoc, setConsentDoc] = useState<UploadedDoc | null>(null);

  // Loading States
  const [compressing, setCompressing] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync selected account when props change
  useEffect(() => {
    if (account) {
      setSelectedAccountId(account.account_id);
      if (account.account_type === "private_clinic") {
        setPrescribingDoctor(account.account_name);
      }
    } else if (accountsList.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accountsList[0].account_id);
    }
  }, [account, accountsList, open]);

  const activeAccount = account || accountsList.find((a) => a.account_id === selectedAccountId);

  // Real-Time Patient History Checking (Debounced)
  useEffect(() => {
    const cleanNid = nationalId.trim().replace(/\D/g, "");
    const cleanPhone = patientPhone.trim().replace(/\D/g, "");

    if (cleanNid.length === 14 || cleanPhone.length >= 10) {
      setCheckingHistory(true);
      const timer = setTimeout(async () => {
        try {
          const matches = await penService.checkPatientHistory(cleanNid, cleanPhone);
          setHistoryMatches(matches);
        } catch {
          setHistoryMatches([]);
        } finally {
          setCheckingHistory(false);
        }
      }, 450);

      return () => clearTimeout(timer);
    } else {
      setHistoryMatches([]);
      setCheckingHistory(false);
    }
  }, [nationalId, patientPhone]);

  // Check if this patient already received this exact product
  const hasDuplicateProduct = historyMatches.some((h) => h.product_name === productName);

  // File Upload & Compression
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "rx" | "id" | "consent"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح (JPEG أو PNG)");
      return;
    }

    setCompressing(type);
    try {
      const compressed = await compressImage(file, 1600, 0.75);

      const doc: UploadedDoc = {
        file,
        previewUrl: compressed.previewUrl,
        originalSize: compressed.originalSizeKB,
        compressedSize: compressed.compressedSizeKB,
        base64: compressed.base64,
      };

      if (type === "rx") setRxDoc(doc);
      if (type === "id") setIdDoc(doc);
      if (type === "consent") setConsentDoc(doc);

      const ratio = Math.round(
        (1 - compressed.compressedSizeKB / Math.max(1, compressed.originalSizeKB)) * 100
      );
      toast.success(
        `تم ضغط الصورة: ${formatFileSize(compressed.originalSizeKB)} ➔ ${formatFileSize(
          compressed.compressedSizeKB
        )} (توفير ${ratio}%)`
      );
    } catch {
      toast.error("حدث خطأ أثناء معالجة وضغط الصورة، يرجى المحاولة مرة أخرى");
    } finally {
      setCompressing(null);
    }
  };

  const handleReset = () => {
    setPrescribingDoctor(account?.account_type === "private_clinic" ? account.account_name : "");
    setPatientName("");
    setPatientPhone("");
    setNationalId("");
    setProductName(INSULIN_PRODUCTS[0]);
    setDispensedQty(1);
    setNotes("");
    setRxDoc(null);
    setIdDoc(null);
    setConsentDoc(null);
    setHistoryMatches([]);
    setExceptionReason("");
  };

  // Submit Standard Dispense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeAccount) {
      toast.error("يرجى اختيار المنشأة أو الصيدلية المعتمدة");
      return;
    }

    if (activeAccount.current_balance < dispensedQty) {
      toast.error(
        `الرصيد المتاح بالمنشأة (${activeAccount.current_balance} قلم) غير كافٍ لصرف ${dispensedQty} قلم.`
      );
      return;
    }

    if (hasDuplicateProduct) {
      toast.error("تم صرف هذا الصنف من الأنسولين للمريض مسبقاً! يرجى تقديم طلب استثناء.");
      setShowExceptionDialog(true);
      return;
    }

    if (!prescribingDoctor.trim()) {
      toast.error("يرجى إدخال اسم الطبيب المعالج");
      return;
    }

    if (!patientName.trim()) {
      toast.error("يرجى إدخال اسم المريض بالكامل");
      return;
    }

    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      toast.error("يرجى إدخال رقم هاتف صحيح للمريض");
      return;
    }

    if (!nationalId.trim() || nationalId.trim().length !== 14 || !/^\d+$/.test(nationalId.trim())) {
      toast.error("يجب أن يتكون الرقم القومي من 14 رقماً بالضبط");
      return;
    }

    if (!rxDoc) {
      toast.error("صورة الروشتة الطبية مطلوبة");
      return;
    }

    if (!idDoc) {
      toast.error("صورة بطاقة الرقم القومي للمريض مطلوبة للتحقق");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload compressed documents
      const rxUpload = await penService.uploadDocument(
        rxDoc.base64,
        activeAccount.account_type,
        activeAccount.account_name,
        `RX_${Date.now()}.jpg`
      );

      const idUpload = await penService.uploadDocument(
        idDoc.base64,
        activeAccount.account_type,
        activeAccount.account_name,
        `ID_${Date.now()}.jpg`
      );

      let consentUploadId = "";
      if (consentDoc) {
        const consentUpload = await penService.uploadDocument(
          consentDoc.base64,
          activeAccount.account_type,
          activeAccount.account_name,
          `CONSENT_${Date.now()}.jpg`
        );
        consentUploadId = consentUpload.fileId;
      }

      // 2. Record dispense in database
      const newRecord = await penService.recordDispense({
        account_id: activeAccount.account_id,
        account_type: activeAccount.account_type,
        account_name: activeAccount.account_name,
        recorded_by: recordedBy,
        prescribing_doctor: prescribingDoctor.trim(),
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        national_id: nationalId.trim(),
        product_name: productName,
        rx_image_id: rxUpload.fileId,
        id_image_id: idUpload.fileId,
        consent_image_id: consentUploadId,
        dispensed_qty: dispensedQty,
        notes: notes.trim(),
      });

      toast.success(
        `تم تسجيل صرف ${dispensedQty} قلم (${productName}) للمريض ${patientName} بنجاح`
      );

      onSuccess(newRecord);
      handleReset();
      onOpenChange(false);
    } catch {
      toast.error("حدث خطأ أثناء حفظ سجل الصرف، يرجى المحاولة ثانية");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Exception Request
  const handleExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    if (!exceptionReason.trim()) {
      toast.error("يرجى كتابة المبرر الطبي أو الإداري للاستثناء");
      return;
    }

    setSubmittingException(true);
    try {
      await penService.requestException({
        account_id: activeAccount.account_id,
        account_name: activeAccount.account_name,
        account_type: activeAccount.account_type,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        national_id: nationalId.trim(),
        prescribing_doctor: prescribingDoctor.trim(),
        product_name: productName,
        pens_count: dispensedQty,
        exception_reason: exceptionReason.trim(),
      });

      toast.success("تم إرسال طلب الاستثناء إلى الإدارة للمراجعة والاعتماد");
      setShowExceptionDialog(false);
      onOpenChange(false);
      handleReset();
    } catch {
      toast.error("فشل إرسال طلب الاستثناء");
    } finally {
      setSubmittingException(false);
    }
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      {/* Account Info Box */}
      <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">المنشأة المعتمدة للصرف:</span>
          {activeAccount && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              الرصيد المتاح: {activeAccount.current_balance} قلم
            </span>
          )}
        </div>

        {!account && accountsList.length > 0 ? (
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value);
              const acc = accountsList.find((a) => a.account_id === e.target.value);
              if (acc?.account_type === "private_clinic") {
                setPrescribingDoctor(acc.account_name);
              }
            }}
            className="w-full text-xs p-2 rounded-md border bg-background font-semibold"
            required
          >
            {accountsList.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_type === "private_clinic" ? "🩺 عيادة: " : a.account_type === "pharmacy" ? "🏪 صيدلية: " : "🏥 مركز: "}
                {a.account_name} — (الرصيد: {a.current_balance} قلم)
              </option>
            ))}
          </select>
        ) : activeAccount ? (
          <div className="flex items-center gap-2">
            {activeAccount.account_type === "private_clinic" ? (
              <Stethoscope className="size-4 text-primary shrink-0" />
            ) : activeAccount.account_type === "pharmacy" ? (
              <Store className="size-4 text-primary shrink-0" />
            ) : (
              <Building2 className="size-4 text-primary shrink-0" />
            )}
            <span className="text-xs font-bold text-foreground">{activeAccount.account_name}</span>
            <span className="text-[10px] text-muted-foreground mr-auto">{activeAccount.territory}</span>
          </div>
        ) : (
          <div className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="size-4" />
            لم يتم تحديد منشأة بعد
          </div>
        )}
      </div>

      {/* Patient & Doctor Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">اسم المريض بالكامل *</Label>
          <Input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="مثال: أحمد محمود علي"
            required
            className="text-xs text-right"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">الطبيب المعالج *</Label>
          <Input
            value={prescribingDoctor}
            onChange={(e) => setPrescribingDoctor(e.target.value)}
            placeholder="د. ..."
            required
            className="text-xs text-right"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">الرقم القومي (14 رقم) *</Label>
            {checkingHistory && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> جاري التحقق...
              </span>
            )}
          </div>
          <Input
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="290XXXXXXXXXXX"
            maxLength={14}
            required
            className="text-xs text-center font-mono tracking-widest font-bold"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">رقم هاتف المريض *</Label>
          <Input
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            required
            className="text-xs font-mono text-right"
            dir="ltr"
          />
        </div>

        {/* Product Selection */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">صنف الأنسولين المطلوب صرفه *</Label>
          <div className="relative">
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border bg-background font-semibold appearance-none pl-8 pr-3 text-right"
              required
            >
              {INSULIN_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="size-4 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Dispensed Qty */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">عدد الأقلام المنصرفة *</Label>
          <Input
            type="number"
            min={1}
            max={activeAccount ? Math.max(1, activeAccount.current_balance) : 10}
            value={dispensedQty}
            onChange={(e) => setDispensedQty(Math.max(1, parseInt(e.target.value) || 1))}
            required
            className="text-xs font-bold text-center"
            dir="ltr"
          />
        </div>
      </div>

      {/* PATIENT HISTORY & DUPLICATE DETECTION ALERT BOX */}
      {historyMatches.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold">
              تنبيه: مسجل لهذا المريض عدد {historyMatches.length} عملية صرف سابقة
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {historyMatches.map((h) => (
              <div
                key={h.record_id}
                className="p-2 rounded-lg bg-background/80 border text-[11px] flex flex-col sm:flex-row justify-between gap-1 text-foreground"
              >
                <div>
                  <span className="font-bold text-primary block">{h.product_name} ({h.dispensed_qty} قلم)</span>
                  <span className="text-muted-foreground text-[10px]">
                    المنشأة: {h.account_name} • الطبيب: {h.prescribing_doctor}
                  </span>
                </div>
                <div className="text-left text-muted-foreground text-[10px] sm:self-center font-mono" dir="ltr">
                  {new Date(h.created_at).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Duplicate Product Alert */}
          {hasDuplicateProduct && (
            <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0" />
                <span>تحذير تكرار الصرف: تم صرف صنف ({productName}) لهذا المريض مسبقاً!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                وفقاً لضوابط برنامج الدعم، يتطلب تكرار نفس صنف الأنسولين الحصول على موافقة <strong>طلب استثناء معتمد</strong> من إدارة البرنامج.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowExceptionDialog(true)}
                className="w-full text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-8"
              >
                <Send className="size-3.5" />
                تقديم طلب استثناء لهذا المريض
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Required Document Uploads with Compression */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-primary" />
            المستندات المؤيدة (ضغط فوري تلقائي)
          </Label>
          <span className="text-[10px] text-muted-foreground font-mono">مشفر ومحمي سحابياً</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Rx Document */}
          <DocumentUploadSlot
            title="صورة الروشتة الطبية *"
            doc={rxDoc}
            compressing={compressing === "rx"}
            onFileSelect={(e) => handleFileUpload(e, "rx")}
            onRemove={() => setRxDoc(null)}
          />

          {/* National ID Document */}
          <DocumentUploadSlot
            title="صورة بطاقة الرقم القومي *"
            doc={idDoc}
            compressing={compressing === "id"}
            onFileSelect={(e) => handleFileUpload(e, "id")}
            onRemove={() => setIdDoc(null)}
          />

          {/* Consent Document (Optional) */}
          <DocumentUploadSlot
            title="إيصال / إقرار الاستلام (اختياري)"
            doc={consentDoc}
            compressing={compressing === "consent"}
            onFileSelect={(e) => handleFileUpload(e, "consent")}
            onRemove={() => setConsentDoc(null)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-muted-foreground">ملاحظات إضافية (اختياري)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات طبية أو إدارية خاصة بالصرف..."
          rows={2}
          className="text-xs resize-none text-right"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={
          submitting ||
          compressing !== null ||
          !activeAccount ||
          activeAccount.current_balance < dispensedQty ||
          hasDuplicateProduct
        }
        className="w-full font-bold gap-2 text-xs sm:text-sm h-10 shadow-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            جاري حفظ الصرف ورفع المستندات المشفرة...
          </>
        ) : (
          <>
            <Syringe className="size-4" />
            تأكيد تسجيل الصرف وخصم الرصيد
          </>
        )}
      </Button>

      {/* Exception Dialog if Duplicate or Exception Needed */}
      {showExceptionDialog && (
        <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
          <DialogContent className="sm:max-w-md p-5" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" /> تقديم طلب استثناء صرف قلم
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                المريض: {patientName || "—"} (الرقم القومي: {nationalId || "—"})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExceptionSubmit} className="space-y-3.5 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <span className="font-semibold block text-foreground">الصنف المطلوب للاستثناء:</span>
                <span className="text-primary font-bold">{productName} ({dispensedQty} قلم)</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">المبرر الطبي أو الإداري للاستثناء *</Label>
                <Textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="مثال: تعديل جرعة بواسطة الطبيب، تلف القلم السابق، تكرار طارئ معتمد..."
                  rows={3}
                  required
                  className="text-xs resize-none text-right"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingException}
                className="w-full font-bold gap-2 text-xs h-10 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Send className="size-4" />
                {submittingException ? "جاري الإرسال..." : "إرسال طلب الاستثناء للإدارة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-4 max-h-[92vh] overflow-y-auto" dir="rtl">
          <DrawerHeader className="p-0 mb-3 text-right" dir="rtl">
            <DrawerTitle className="text-base font-bold flex items-center gap-2">
              <Syringe className="size-5 text-primary" /> تسجيل صرف قلم أنسولين لمريض
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              تسجيل عملية الصرف مع التحقق الفوري من التكرار ورفع المستندات الطبية المضغوطة.
            </DrawerDescription>
          </DrawerHeader>
          {formBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-5" dir="rtl">
        <DialogHeader className="text-right" dir="rtl">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Syringe className="size-5 text-primary" /> تسجيل صرف قلم أنسولين لمريض
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            تسجيل عملية الصرف، والتحقق التلقائي من السجل السابق، وتوثيق المستندات المرفقة.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

function DocumentUploadSlot({
  title,
  doc,
  compressing,
  onFileSelect,
  onRemove,
}: {
  title: string;
  doc: UploadedDoc | null;
  compressing: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-dashed rounded-lg p-2.5 text-center relative hover:bg-muted/30 transition flex flex-col items-center justify-center min-h-[110px]">
      {compressing ? (
        <div className="space-y-1.5 py-2">
          <Loader2 className="size-5 animate-spin text-primary mx-auto" />
          <span className="text-[10px] text-muted-foreground block font-medium">جاري الضغط...</span>
        </div>
      ) : doc ? (
        <div className="space-y-1.5 w-full">
          <div className="relative mx-auto size-14 rounded overflow-hidden border shadow-xs">
            <img src={doc.previewUrl} alt={title} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-0 left-0 bg-destructive text-white p-0.5 rounded-br"
            >
              <X className="size-3" />
            </button>
          </div>
          <span className="text-[11px] font-bold text-foreground block truncate">{title}</span>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">
            {formatFileSize(doc.compressedSize)} (جاهز)
          </span>
        </div>
      ) : (
        <label className="cursor-pointer space-y-1.5 w-full flex flex-col items-center py-1">
          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Upload className="size-4" />
          </div>
          <span className="text-[11px] font-semibold text-foreground block">{title}</span>
          <span className="text-[9px] text-muted-foreground block">كاميرا أو ملف</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileSelect}
          />
        </label>
      )}
    </div>
  );
}
