import React, { useState, useEffect, useCallback } from "react";
import { penService } from "@/lib/onedrive-pen.service";
import type {
  EnrolledAccount,
  DispenseRecord,
  StockRequest,
  DispenseException,
  StorageStatus,
} from "@/types/pen-program.types";
import { PenOverviewTab } from "@/components/pen/PenOverviewTab";
import { RepAccountsManagerTab } from "@/components/pen/RepAccountsManagerTab";
import { PenDispenseRecordsTab } from "@/components/pen/PenDispenseRecordsTab";
import { PenExceptionsAndStockTab } from "@/components/pen/PenExceptionsAndStockTab";
import { DispensePortalView } from "@/components/pen/DispensePortalView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";
import systemLogo from "@/assets/system-logo.jpg";
import {
  corporateAuthService,
  type CorporateUser,
} from "@/lib/corporate-auth.service";
import { CorporateLoginScreen } from "@/components/auth/CorporateLoginScreen";
import {
  Syringe,
  BarChart3,
  Users,
  Eye,
  AlertTriangle,
  RefreshCw,
  Cloud,
  FileSpreadsheet,
  Settings,
  Download,
  Trash2,
  ExternalLink,
  Share2,
  Check,
  Building2,
  ShieldCheck,
  FolderOpen,
  LogOut,
  User as UserIcon,
} from "lucide-react";

export function App() {
  // Detect if accessing the standalone Pharmacy Dispensing Portal
  const isPortalRoute = () => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    return (
      params.get("portal") === "true" ||
      params.get("view") === "portal" ||
      params.get("mode") === "portal" ||
      hash.includes("portal") ||
      path.endsWith("/portal")
    );
  };

  const [isPortalMode, setIsPortalMode] = useState<boolean>(isPortalRoute);

  useEffect(() => {
    const handleUrlChange = () => {
      setIsPortalMode(isPortalRoute());
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);

  if (isPortalMode) {
    return <StandalonePharmacyPortal />;
  }

  return <AdminManagementPortal />;
}

/* ==================================================================== */
/*  STANDALONE PHARMACY & CLINIC DISPENSING PORTAL                       */
/*  Completely separate app layout with zero admin navigation or tabs    */
/* ==================================================================== */
function StandalonePharmacyPortal() {
  const [storageStatus] = useState<StorageStatus>(() => penService.getStorageStatus());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Dedicated Pharmacy Portal Header */}
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-auto flex items-center shrink-0">
              <img
                src={systemLogo}
                alt="EVA Insulin Pen Program"
                className="max-h-full w-auto object-contain"
              />
            </div>
            <div className="border-r border-border pr-3">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
                  <Syringe className="size-4 text-primary shrink-0" />
                  محطة صرف أقلام الأنسولين
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex border-primary/30 text-primary bg-primary/5 text-[9px] font-bold"
                >
                  بوابة الصيدليات والعيادات
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                بوابة الخدمة الذاتية المعتمدة لصرف الأقلام ودعم المرضى
              </p>
            </div>
          </div>

          {/* Right Status Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border text-[11px]">
              <span
                className={`size-2 rounded-full ${
                  storageStatus.excelConnected ? "bg-emerald-500 animate-pulse" : "bg-sky-500"
                }`}
              />
              <span className="font-medium text-foreground">
                {storageStatus.excelConnected ? "سحابة Microsoft 365" : "تخزين مشفر آمن"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Standalone Dispensing View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6">
        <DispensePortalView />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/40 py-3 px-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} EVA Pharma — منظومة دعم مرضى أقلام الأنسولين. جميع الحقوق محفوظة.</p>
      </footer>

      <Toaster position="bottom-right" dir="rtl" richColors />
    </div>
  );
}

/* ==================================================================== */
/*  MANAGEMENT & FIELD REP PORTAL                                       */
/*  Comprehensive admin analytics, enrolled facilities & verification    */
/* ==================================================================== */
function AdminManagementPortal() {
  // Corporate User Authentication Session
  const [corporateUser, setCorporateUser] = useState<CorporateUser | null>(() => corporateAuthService.getCurrentUser());

  useEffect(() => {
    return corporateAuthService.subscribe((u) => setCorporateUser(u));
  }, []);

  const [adminTab, setAdminTab] = useState<
    "overview" | "accounts" | "dispenses" | "requests" | "settings"
  >("overview");

  // Live Data States
  const [accounts, setAccounts] = useState<EnrolledAccount[]>([]);
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [exceptions, setExceptions] = useState<DispenseException[]>([]);
  const [overviewStats, setOverviewStats] = useState(penService.getOverviewStats());
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(penService.getStorageStatus());
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSharepointLink, setCopiedSharepointLink] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, disps, stks, excs] = await Promise.all([
        penService.getAccounts(),
        penService.getDispenses(),
        penService.getStockRequests(),
        penService.getExceptions(),
      ]);
      setAccounts(accs);
      setDispenses(disps);
      setStockRequests(stks);
      setExceptions(excs);
      setOverviewStats(penService.getOverviewStats());
      setStorageStatus(penService.getStorageStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingRequestsCount =
    stockRequests.filter((r) => r.status === "pending").length +
    exceptions.filter((e) => e.admin_status === "pending").length;

  const getPortalUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base.replace(/\/$/, "")}?portal=true`;
  };

  const handleOpenPharmacyPortal = () => {
    window.open(getPortalUrl(), "_blank");
  };

  const handleCopyPharmacyPortalLink = () => {
    navigator.clipboard.writeText(getPortalUrl());
    setCopiedLink(true);
    toast.success("تم نسخ رابط محطة الصرف المخصصة للصيدليات إلى الحافظة!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySharepointLink = () => {
    if (storageStatus.sharepointFolderUrl) {
      navigator.clipboard.writeText(storageStatus.sharepointFolderUrl);
      setCopiedSharepointLink(true);
      toast.success("تم نسخ رابط مجلد شيربوينت إيفا فارما إلى الحافظة!");
      setTimeout(() => setCopiedSharepointLink(false), 2500);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = penService.exportBackup();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EVA_Insulin_Pen_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير النسخة الاحتياطية لقاعدة البيانات بنجاح");
  };

  const handleClearAllData = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في تفريغ وإعادة ضبط كافة سجلات قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.")) {
      penService.clearAllData();
      void loadData();
      toast.success("تم تفريغ كافة سجلات قاعدة البيانات وإعادة الضبط");
    }
  };

  const handleSignOut = () => {
    corporateAuthService.signOut();
    toast.success("Signed out of EVA Pharma account");
  };

  if (!corporateUser) {
    return (
      <>
        <CorporateLoginScreen
          onSuccess={(user) => setCorporateUser(user)}
          onOpenPharmacyPortal={handleOpenPharmacyPortal}
        />
        <Toaster position="bottom-right" dir="ltr" richColors />
      </>
    );
  }

  const userInitials = corporateUser.displayName
    ? corporateUser.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "EP";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="ltr">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-md px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-auto flex items-center shrink-0">
              <img
                src={systemLogo}
                alt="EVA Insulin Pen Program"
                className="max-h-full w-auto object-contain"
              />
            </div>
            <div className="border-l border-border pl-3">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
                  <Syringe className="size-4 text-primary shrink-0" />
                  EVA Insulin Pen Program
                </h1>
                <Badge
                  variant="outline"
                  className="hidden md:inline-flex border-primary/30 text-primary bg-primary/5 text-[9px] font-bold"
                >
                  Management & Field Rep Portal
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Patient Support, Inventory Governance & Microsoft 365 Cloud Integration
              </p>
            </div>
          </div>

          {/* Right Side: Storage Status, Microsoft User Profile & Pharmacy Portal Direct Link */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* Storage Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border text-[11px]">
              <span
                className={`size-2 rounded-full ${
                  storageStatus.excelConnected ? "bg-emerald-500 animate-pulse" : "bg-sky-500"
                }`}
              />
              <span className="font-medium text-foreground">
                {storageStatus.excelConnected ? "Microsoft 365 Cloud" : "Encrypted Storage"}
              </span>
            </div>

            {/* Corporate Signed-In User Pill & Sign Out */}
            <div className="flex items-center gap-1.5 bg-muted/40 pl-2 pr-1 py-0.5 rounded-full border">
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="font-bold text-foreground block text-[11px] leading-tight">
                    {corporateUser.displayName}
                  </span>
                  <span className="text-[9px] text-muted-foreground block font-mono">
                    {corporateUser.email}
                  </span>
                </div>
                <ShieldCheck className="size-3.5 text-emerald-500 ml-0.5" />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="size-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sign out of corporate account"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>

            {/* Separated Pharmacy Portal Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPharmacyPortalLink}
                className="text-xs font-semibold h-8 gap-1 border-border"
                title="Copy direct URL to send to pharmacies or clinics"
              >
                {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5 text-muted-foreground" />}
                <span className="hidden md:inline">{copiedLink ? "Link Copied" : "Copy Portal Link"}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleOpenPharmacyPortal}
                className="text-xs font-bold h-8 gap-1.5 bg-primary text-primary-foreground shadow-xs"
                title="Open dedicated Pharmacy Dispensing Terminal in a separate window"
              >
                <Building2 className="size-3.5" />
                <span>Pharmacy Portal Station</span>
                <ExternalLink className="size-3 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-5 space-y-4">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Button
              variant={adminTab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("overview")}
              className="font-bold text-xs gap-1.5 h-8"
            >
              <BarChart3 className="size-3.5" />
              Overview & Analytics
            </Button>

            <Button
              variant={adminTab === "accounts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("accounts")}
              className="font-bold text-xs gap-1.5 h-8"
            >
              <Users className="size-3.5" />
              Enrolled Facilities ({accounts.length})
            </Button>

            <Button
              variant={adminTab === "dispenses" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("dispenses")}
              className="font-bold text-xs gap-1.5 h-8"
            >
              <Eye className="size-3.5" />
              Dispense Audit Records ({dispenses.length})
            </Button>

            <Button
              variant={adminTab === "requests" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("requests")}
              className="font-bold text-xs gap-1.5 h-8 relative"
            >
              <AlertTriangle className="size-3.5" />
              Requests & Exceptions
              {pendingRequestsCount > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </Button>

            <Button
              variant={adminTab === "settings" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("settings")}
              className="font-bold text-xs gap-1.5 h-8"
            >
              <Settings className="size-3.5" />
              الإعدادات والربط
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* TAB CONTENTS */}
        {adminTab === "overview" && (
          <PenOverviewTab stats={overviewStats} />
        )}

        {adminTab === "accounts" && (
          <RepAccountsManagerTab
            accounts={accounts}
            onRefresh={() => void loadData()}
            repName={corporateUser.displayName || "Field Representative"}
          />
        )}

        {adminTab === "dispenses" && (
          <PenDispenseRecordsTab
            records={dispenses}
            onRefresh={() => void loadData()}
          />
        )}

        {adminTab === "requests" && (
          <PenExceptionsAndStockTab
            stockRequests={stockRequests}
            exceptions={exceptions}
            onRefresh={() => void loadData()}
            isAdmin={true}
          />
        )}

        {adminTab === "settings" && (
          <div className="space-y-4" dir="rtl">
            <div className="p-4 sm:p-6 rounded-2xl border bg-card space-y-4">
              <div className="flex items-center gap-2">
                <Cloud className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  إعدادات الربط السحابي وقاعدة بيانات EVA Pharma
                </h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                المنظومة متصلة بجداول Excel Online المعتمدة ومجلدات SharePoint / OneDrive لحفظ السجلات وتوثيق صرف الأقلام والمستندات الطبية المشفرة.
              </p>

              {/* Active Corporate User Profile Card */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-xs">
                      {userInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          {corporateUser.displayName}
                        </h4>
                        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                          جلسة عمل نشطة
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono block">
                        {corporateUser.email} • {corporateUser.department}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    تسجيل الخروج / تبديل الحساب
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-card p-2.5 rounded-lg border text-muted-foreground">
                  <div>
                    <span className="block text-[10px] font-semibold text-foreground">الدور الوظيفي:</span>
                    <span className="text-foreground font-medium">{corporateUser.role}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-foreground">دومين المؤسسة:</span>
                    <span className="font-mono text-foreground font-medium">@evapharma.com</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-foreground">حالة الأمان:</span>
                    <span className="text-emerald-600 font-medium">بريد مفعل وكلمة مرور مشفرة</span>
                  </div>
                </div>
              </div>

              {/* Official EVA Pharma SharePoint Link Card */}
              {storageStatus.sharepointFolderUrl && (
                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="size-5 text-sky-600 dark:text-sky-400" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          المجلد الرسمي لشيربوينت وون درايف EVA Pharma
                        </h4>
                        <span className="text-[10px] text-muted-foreground block">
                          المسار المتصل: /Documents/EVA Insulin Pen Program (hady_mohamed_evapharma_com)
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold">
                      شيربوينت متصل
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={storageStatus.sharepointFolderUrl}
                      className="flex-1 text-xs font-mono p-2 rounded-lg border bg-background text-foreground truncate"
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopySharepointLink}
                      className="text-xs font-semibold h-9 shrink-0 gap-1.5"
                    >
                      {copiedSharepointLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
                      {copiedSharepointLink ? "تم النسخ" : "نسخ الرابط"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(storageStatus.sharepointFolderUrl, "_blank")}
                      className="text-xs font-semibold h-9 shrink-0 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <ExternalLink className="size-3.5" />
                      فتح في SharePoint
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
                  <span className="font-semibold block text-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="size-4 text-emerald-500" />
                    قاعدة بيانات جداول Excel Online:
                  </span>
                  <span className="font-mono text-muted-foreground block text-[11px]" dir="ltr">
                    {storageStatus.excelFilePath}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    الجداول: Tbl_Enrolled_Accounts, Tbl_Dispenses, Tbl_Stock_Requests, Tbl_Exceptions
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
                  <span className="font-semibold block text-foreground flex items-center gap-1.5">
                    <Cloud className="size-4 text-sky-500" />
                    مجلد مستندات المرضى OneDrive:
                  </span>
                  <span className="font-mono text-muted-foreground block text-[11px]" dir="ltr">
                    {storageStatus.oneDriveFolder}
                  </span>
                  <span className="text-[10px] text-muted-foreground block" dir="ltr">
                    Patient_Documents/&#123;facilityType&#125;/&#123;facilityName&#125;/
                  </span>
                </div>
              </div>

              {/* Dedicated Portal Distribution Banner */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">رابط محطة الصرف المخصصة للصيدليات والعيادات</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    محطة مستقلة
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  زوّد الأطباء والصيادلة بهذا الرابط المستقل للدخول بكود الـ PIN الخاص بجهتهم وصرف الأقلام دون أي وصول للوحة الإدارة:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPortalUrl()}
                    className="flex-1 text-xs font-mono p-2 rounded-lg border bg-background text-foreground"
                    dir="ltr"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPharmacyPortalLink}
                    className="text-xs font-semibold h-9 shrink-0 gap-1.5"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
                    {copiedLink ? "تم النسخ" : "نسخ الرابط"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenPharmacyPortal}
                    className="text-xs font-semibold h-9 shrink-0 gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    فتح المحطة
                  </Button>
                </div>
              </div>

              {/* Actions: Export Backup & Reset */}
              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                <Button
                  size="sm"
                  onClick={handleExportBackup}
                  className="font-bold gap-1.5 text-xs h-9"
                >
                  <Download className="size-3.5" />
                  تصدير نسخة احتياطية كاملة (JSON)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllData}
                  className="font-semibold gap-1.5 text-xs h-9 text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 className="size-3.5" />
                  إعادة ضبط وتفريغ قاعدة البيانات
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Sonner Toaster */}
      <Toaster position="bottom-right" dir="ltr" richColors />
    </div>
  );
}

export default App;
