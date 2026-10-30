import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  type CorporateRole,
} from "@/lib/corporate-auth.service";
import { CorporateLoginScreen } from "@/components/auth/CorporateLoginScreen";
import { TerritorySelectionDialog } from "@/components/auth/TerritorySelectionDialog";
import {
  Syringe,
  BarChart3,
  Users,
  Eye,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Share2,
  Check,
  Building2,
  ShieldCheck,
  LogOut,
  MapPin,
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
                  بوابة صرف اقلام انسولين إيفا
                </h1>
              </div>
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
/*  Comprehensive admin analytics, enrolled accounts & verification    */
/* ==================================================================== */
function AdminManagementPortal() {
  // Corporate User Authentication Session
  const [corporateUser, setCorporateUser] = useState<CorporateUser | null>(() => corporateAuthService.getCurrentUser());

  useEffect(() => {
    return corporateAuthService.subscribe((u) => setCorporateUser(u));
  }, []);

  const [adminTab, setAdminTab] = useState<
    "overview" | "accounts" | "dispenses" | "requests"
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

  // Territory & Role Dialog State
  const [showTerritoryEdit, setShowTerritoryEdit] = useState(false);

  // Prompt onboarding if user has not selected bricks yet
  useEffect(() => {
    if (
      corporateUser &&
      (!corporateUser.assignedBricks || corporateUser.assignedBricks.length === 0) &&
      corporateUser.role !== "Program Administrator"
    ) {
      setShowTerritoryEdit(true);
    }
  }, [corporateUser]);

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

  // ====================================================================
  // TERRITORY-BASED DATA ISOLATION (RBAC & BRICKS SCOPING)
  // Each MR and DM only sees their assigned Bricks!
  // ====================================================================
  const userBricks = useMemo(() => corporateUser?.assignedBricks || [], [corporateUser]);
  const isSuperAdmin = corporateUser?.role === "Program Administrator";

  const visibleAccounts = useMemo(() => {
    if (isSuperAdmin || userBricks.length === 0) return accounts;
    return accounts.filter((a: EnrolledAccount) => userBricks.includes(a.territory));
  }, [accounts, userBricks, isSuperAdmin]);

  const visibleAccountIds = useMemo(() => {
    return new Set(visibleAccounts.map((a: EnrolledAccount) => a.account_id));
  }, [visibleAccounts]);

  const visibleDispenses = useMemo(() => {
    if (isSuperAdmin || userBricks.length === 0) return dispenses;
    return dispenses.filter((d: DispenseRecord) => visibleAccountIds.has(d.account_id));
  }, [dispenses, visibleAccountIds, isSuperAdmin]);

  const visibleStockRequests = useMemo(() => {
    if (isSuperAdmin || userBricks.length === 0) return stockRequests;
    return stockRequests.filter((r: StockRequest) => visibleAccountIds.has(r.account_id));
  }, [stockRequests, visibleAccountIds, isSuperAdmin]);

  const visibleExceptions = useMemo(() => {
    if (isSuperAdmin || userBricks.length === 0) return exceptions;
    return exceptions.filter((e: DispenseException) => visibleAccountIds.has(e.account_id));
  }, [exceptions, visibleAccountIds, isSuperAdmin]);

  // Scoped Overview Stats calculated strictly from filtered accounts & dispenses
  const scopedOverviewStats = useMemo(() => {
    if (isSuperAdmin) return overviewStats;

    const totalAllocated = visibleAccounts.reduce((sum: number, a: EnrolledAccount) => sum + (a.allocated_pens || 0), 0);
    const totalDispensed = visibleDispenses.reduce((sum: number, d: DispenseRecord) => sum + (d.dispensed_qty || 1), 0);
    const remainingStock = visibleAccounts.reduce((sum: number, a: EnrolledAccount) => sum + (a.current_balance || 0), 0);

    const patientKeys = new Set<string>();
    visibleDispenses.forEach((d: DispenseRecord) => {
      const key = (d.national_id && d.national_id.trim()) || (d.patient_phone && d.patient_phone.trim()) || d.patient_name;
      if (key) patientKeys.add(key);
    });
    const patientsServed = patientKeys.size;

    const trendMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" });
      trendMap[key] = 0;
    }

    visibleDispenses.forEach((d: DispenseRecord) => {
      const dateKey = new Date(d.created_at).toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" });
      if (trendMap[dateKey] !== undefined) {
        trendMap[dateKey] += d.dispensed_qty || 1;
      }
    });

    const chartData = Object.entries(trendMap).map(([date, pens]) => ({
      date,
      pens,
    }));

    const accStats: Record<string, { name: string; type: string; pens: number }> = {};
    visibleAccounts.forEach((a: EnrolledAccount) => {
      accStats[a.account_id] = { name: a.account_name, type: a.account_type, pens: a.dispensed_count || 0 };
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
  }, [visibleAccounts, visibleDispenses, isSuperAdmin, overviewStats]);

  const pendingRequestsCount =
    visibleStockRequests.filter((r: StockRequest) => r.status === "pending").length +
    visibleExceptions.filter((e: DispenseException) => e.admin_status === "pending").length;

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
    toast.success("تم نسخ رابط بوابة صرف أقلام إيفا المخصصة للصيدليات إلى الحافظة!");
    setTimeout(() => setCopiedLink(false), 2500);
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
              <h1 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
                <Syringe className="size-4 text-primary shrink-0" />
                EVA Insulin Pen Program
              </h1>
            </div>
          </div>

          {/* Right Side: Corporate User Profile & Pharmacy Portal Direct Link */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
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
              Enrolled Accounts ({visibleAccounts.length})
            </Button>

            <Button
              variant={adminTab === "dispenses" ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab("dispenses")}
              className="font-bold text-xs gap-1.5 h-8"
            >
              <Eye className="size-3.5" />
              Dispense Audit Records ({visibleDispenses.length})
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

        {/* TAB CONTENTS (Strictly scoped to assigned Bricks) */}
        {adminTab === "overview" && (
          <PenOverviewTab stats={scopedOverviewStats} />
        )}

        {adminTab === "accounts" && (
          <RepAccountsManagerTab
            accounts={visibleAccounts}
            onRefresh={() => void loadData()}
            repName={corporateUser.displayName || "Field Representative"}
            assignedBricks={userBricks}
            userRole={corporateUser.role}
          />
        )}

        {adminTab === "dispenses" && (
          <PenDispenseRecordsTab
            records={visibleDispenses}
            onRefresh={() => void loadData()}
          />
        )}

        {adminTab === "requests" && (
          <PenExceptionsAndStockTab
            stockRequests={visibleStockRequests}
            exceptions={visibleExceptions}
            onRefresh={() => void loadData()}
            isAdmin={corporateUser.role === "District Manager" || isSuperAdmin}
          />
        )}
      </main>

      {/* Territory & Role Selection / Adjustment Modal */}
      <TerritorySelectionDialog
        open={showTerritoryEdit}
        onOpenChange={setShowTerritoryEdit}
        userEmail={corporateUser.email}
        userName={corporateUser.displayName}
        initialRole={corporateUser.role}
        initialBricks={userBricks}
        isFirstTime={userBricks.length === 0}
        onSave={async (newRole, newBricks) => {
          const updated = await corporateAuthService.updateUserRoleAndBricks(
            corporateUser.email,
            newRole,
            newBricks
          );
          setCorporateUser(updated);
          setShowTerritoryEdit(false);
          void loadData();
        }}
      />

      {/* Global Sonner Toaster */}
      <Toaster position="bottom-right" dir="ltr" richColors />
    </div>
  );
}

export default App;
