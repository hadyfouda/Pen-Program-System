import React, { useState, useMemo } from "react";
import type { EnrolledAccount, AccountType } from "@/types/pen-program.types";
import { EnrollAccountModal } from "./EnrollAccountModal";
import { DispenseFormModal } from "./DispenseFormModal";
import { penService } from "@/lib/onedrive-pen.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Stethoscope,
  Store,
  Building2,
  Plus,
  Minus,
  Syringe,
  Search,
  Key,
  Copy,
  Check,
  Send,
  Phone,
  MapPin,
  Package,
  Users,
  RefreshCw,
  ExternalLink,
  Share2,
  Download,
} from "lucide-react";

interface RepAccountsManagerTabProps {
  accounts: EnrolledAccount[];
  onRefresh: () => void;
  repName?: string;
}

export function RepAccountsManagerTab({
  accounts,
  onRefresh,
  repName = "Field Representative",
}: RepAccountsManagerTabProps) {
  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<"all" | AccountType>("all");
  const [selectedRep, setSelectedRep] = useState("");
  const [selectedTerritory, setSelectedTerritory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [dispenseAccount, setDispenseAccount] = useState<EnrolledAccount | null>(null);
  const [isDirectDispenseOpen, setIsDirectDispenseOpen] = useState(false);

  // Stock Adjustment Modal (+ Add / - Remove)
  const [stockModalAccount, setStockModalAccount] = useState<EnrolledAccount | null>(null);
  const [stockAction, setStockAction] = useState<"add" | "remove">("add");
  const [stockAmount, setStockAmount] = useState<number>(10);
  const [adjustingStock, setAdjustingStock] = useState(false);

  // PIN Reset Modal
  const [pinModalData, setPinModalData] = useState<{ account: EnrolledAccount; newPin: string } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  // Unique Reps and Territories for dropdown filters
  const repList = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.enrolled_by_rep).filter(Boolean)));
  }, [accounts]);

  const territoryList = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.territory).filter(Boolean)));
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (typeFilter !== "all" && acc.account_type !== typeFilter) return false;
      if (selectedRep && acc.enrolled_by_rep !== selectedRep) return false;
      if (selectedTerritory && acc.territory !== selectedTerritory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = acc.account_name.toLowerCase().includes(q);
        const matchTerritory = acc.territory.toLowerCase().includes(q);
        const matchPhone = acc.phone.includes(q);
        const matchSpecialty = acc.specialty?.toLowerCase().includes(q) || false;
        const matchRep = acc.enrolled_by_rep.toLowerCase().includes(q);
        return matchName || matchTerritory || matchPhone || matchSpecialty || matchRep;
      }
      return true;
    });
  }, [accounts, typeFilter, selectedRep, selectedTerritory, searchQuery]);

  // Handle Stock Adjustment
  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalAccount || stockAmount <= 0) return;

    if (stockAction === "remove" && stockAmount > stockModalAccount.current_balance) {
      toast.error(`Cannot deduct ${stockAmount} pens. Current available stock is only ${stockModalAccount.current_balance} pens.`);
      return;
    }

    setAdjustingStock(true);
    try {
      await penService.adjustStock(stockModalAccount.account_id, stockAmount, stockAction);
      toast.success(
        stockAction === "add"
          ? `Added ${stockAmount} pens to "${stockModalAccount.account_name}" balance successfully.`
          : `Deducted ${stockAmount} pens from "${stockModalAccount.account_name}" balance successfully.`
      );
      setStockModalAccount(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Error occurred while adjusting stock");
    } finally {
      setAdjustingStock(false);
    }
  };

  // Handle PIN Reset
  const handleResetPin = async (acc: EnrolledAccount) => {
    try {
      const newPin = await penService.resetPin(acc.account_id);
      setPinModalData({ account: acc, newPin });
      onRefresh();
      toast.success(`New PIN generated for "${acc.account_name}"`);
    } catch {
      toast.error("Failed to reset PIN code");
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    toast.success("PIN copied to clipboard");
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const getPortalUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base.replace(/\/$/, "")}?portal=true`;
  };

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(getPortalUrl());
    setCopiedPortalLink(true);
    toast.success("Dedicated Pharmacy Portal link copied to clipboard!");
    setTimeout(() => setCopiedPortalLink(false), 2500);
  };

  const handleWhatsAppShare = (acc: EnrolledAccount, pinCode?: string) => {
    const portalUrl = getPortalUrl();
    const targetPin = pinCode || acc.raw_pin || acc.pin_hash;
    const msg = `Dear ${acc.account_name},\n\nPlease find below your access credentials for the EVA Insulin Pen Dispensing Portal:\n\n🔑 Secure Access PIN: *${targetPin}*\n📦 Current Pen Stock Balance: *${acc.current_balance} Pens*\n\n🌐 Dedicated Dispensing Station Portal:\n${portalUrl}`;

    const cleanPhone = acc.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("01") ? `2${cleanPhone}` : cleanPhone;
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleExportAccountsCSV = () => {
    if (accounts.length === 0) {
      toast.error("No enrolled facilities to export");
      return;
    }

    const headers = [
      "Account ID",
      "Facility Name",
      "Type",
      "Specialty",
      "Territory",
      "Phone",
      "Enrolled By Rep",
      "Allocated Pens",
      "Dispensed Count",
      "Current Stock Balance",
      "Status",
      "Enrollment Date",
    ];

    const rows = filteredAccounts.map((a) => [
      `"${a.account_id}"`,
      `"${a.account_name.replace(/"/g, '""')}"`,
      `"${a.account_type}"`,
      `"${(a.specialty || "").replace(/"/g, '""')}"`,
      `"${a.territory.replace(/"/g, '""')}"`,
      `"${a.phone}"`,
      `"${a.enrolled_by_rep.replace(/"/g, '""')}"`,
      a.allocated_pens,
      a.dispensed_count,
      a.current_balance,
      `"${a.status}"`,
      `"${new Date(a.created_at).toISOString().slice(0, 10)}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EVA_Enrolled_Facilities_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Enrolled facilities exported to Excel (CSV) successfully");
  };

  return (
    <div className="space-y-4" dir="ltr">
      {/* Top Action Bar & Metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Enrolled Facilities & Stock Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage participating doctors, clinics, and pharmacies, allocate stock quotas, and dispatch secure access PINs
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAccountsCSV}
            disabled={accounts.length === 0}
            className="text-xs font-semibold gap-1.5 h-9 border-border"
            title="Download Excel / CSV spreadsheet of all enrolled accounts"
          >
            <Download className="size-4 text-emerald-600" />
            <span>Export Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPortalLink}
            className="text-xs font-semibold gap-1.5 h-9 border-border"
          >
            {copiedPortalLink ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4 text-primary" />}
            {copiedPortalLink ? "Link Copied!" : "Copy Pharmacy Portal Link"}
          </Button>

          <Button
            onClick={() => setIsEnrollOpen(true)}
            className="font-bold gap-2 text-xs h-9 shadow-sm"
          >
            <Plus className="size-4" />
            Enroll New Facility
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsDirectDispenseOpen(true)}
            disabled={accounts.length === 0}
            className="font-semibold gap-2 text-xs h-9 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Syringe className="size-4" />
            Direct Rep Dispense
          </Button>
        </div>
      </div>

      {/* Advanced Filter Bar (Rep, Territory, Type, Search) */}
      <div className="p-3.5 rounded-xl border bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              placeholder="Search by facility name, specialty, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-9 h-9"
            />
          </div>

          {/* Rep Filter */}
          <div>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border bg-background h-9"
            >
              <option value="">— All Representatives —</option>
              {repList.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Territory Filter */}
          <div>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border bg-background h-9"
            >
              <option value="">— All Territories / Governorates —</option>
              {territoryList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setSelectedRep("");
                setSelectedTerritory("");
                setSearchQuery("");
              }}
              className="flex-1 text-xs h-9 font-medium"
            >
              Reset Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-9 px-2.5"
              title="Refresh"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t">
          {[
            { id: "all", label: "All Facilities", count: accounts.length },
            {
              id: "private_clinic",
              label: "Private Clinics",
              count: accounts.filter((a) => a.account_type === "private_clinic").length,
            },
            {
              id: "pharmacy",
              label: "Pharmacies",
              count: accounts.filter((a) => a.account_type === "pharmacy").length,
            },
            {
              id: "medical_center",
              label: "Medical Centers",
              count: accounts.filter((a) => a.account_type === "medical_center").length,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id as any)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition shrink-0 flex items-center gap-1.5 ${
                typeFilter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[10px] opacity-80 px-1 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List / Cards Grid */}
      {accounts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed bg-muted/20 space-y-3">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Users className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">No facilities enrolled yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            The system is clean with no mock data. Start by enrolling a participating doctor's clinic or pharmacy to allocate initial pen stock and generate their PIN.
          </p>
          <Button
            onClick={() => setIsEnrollOpen(true)}
            className="font-bold gap-2 text-xs mt-2"
          >
            <Plus className="size-4" />
            Enroll First Facility
          </Button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-xs rounded-xl border bg-card">
          No facilities matched the current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredAccounts.map((acc) => {
            const usagePercent =
              acc.allocated_pens > 0
                ? Math.min(100, Math.round((acc.dispensed_count / acc.allocated_pens) * 100))
                : 0;

            return (
              <div
                key={acc.account_id}
                className="rounded-xl border bg-card p-3.5 space-y-3 hover:shadow-xs transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {acc.account_type === "private_clinic" ? (
                          <Stethoscope className="size-4" />
                        ) : acc.account_type === "pharmacy" ? (
                          <Store className="size-4" />
                        ) : (
                          <Building2 className="size-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                          {acc.account_name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground block">
                          {acc.account_type === "private_clinic"
                            ? acc.specialty || "Private Clinic"
                            : acc.account_type === "pharmacy"
                            ? "Authorized Pharmacy"
                            : "Medical Center"}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        acc.current_balance > 5
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                          : acc.current_balance > 0
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold"
                          : "bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold"
                      }
                    >
                      Stock: {acc.current_balance} pens
                    </Badge>
                  </div>

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{acc.territory}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="size-3 text-muted-foreground shrink-0" />
                      <span className="font-mono text-[10px]">{acc.phone}</span>
                    </div>
                  </div>

                  {/* Stock Progress */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">Dispensed from Quota</span>
                      <span className="font-bold text-foreground">
                        {acc.dispensed_count} / {acc.allocated_pens} pens ({usagePercent}%)
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-1.5" />
                  </div>

                  {/* Rep Info & PIN */}
                  <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
                    <span>Rep: {acc.enrolled_by_rep}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-foreground">PIN: {acc.raw_pin || "••••••"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => setDispenseAccount(acc)}
                      disabled={acc.current_balance === 0}
                      className="font-bold gap-1 text-[11px] h-8 shadow-xs"
                    >
                      <Syringe className="size-3.5" />
                      Dispense Pen
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStockModalAccount(acc);
                        setStockAmount(10);
                        setStockAction("add");
                      }}
                      className="font-semibold gap-1 text-[11px] h-8 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Package className="size-3.5" />
                      Adjust Stock
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPin(acc)}
                      className="font-medium gap-1 text-[11px] h-7 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <Key className="size-3" />
                      Reset PIN
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWhatsAppShare(acc)}
                      className="font-medium gap-1 text-[11px] h-7 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/5"
                    >
                      <Send className="size-3" />
                      Send via WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Adjustment Modal (+ Add / - Remove) */}
      {stockModalAccount && (
        <Dialog open={!!stockModalAccount} onOpenChange={(open) => !open && setStockModalAccount(null)}>
          <DialogContent className="sm:max-w-md p-5" dir="ltr">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Package className="size-5 text-primary" /> Stock Adjustment — {stockModalAccount.account_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Currently Available Stock: <strong>{stockModalAccount.current_balance} pens</strong> (Total Delivered: {stockModalAccount.allocated_pens} pens)
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-4 py-2">
              {/* Add vs Remove toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setStockAction("add")}
                  className={`py-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                    stockAction === "add"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Plus className="size-4" />
                  + Add Stock Delivery
                </button>

                <button
                  type="button"
                  onClick={() => setStockAction("remove")}
                  className={`py-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                    stockAction === "remove"
                      ? "bg-destructive text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Minus className="size-4" />
                  - Deduct / Return Stock
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quantity of Pens to {stockAction === "add" ? "Add" : "Deduct"} *</Label>
                <Input
                  type="number"
                  min={1}
                  max={stockAction === "remove" ? stockModalAccount.current_balance : 500}
                  value={stockAmount}
                  onChange={(e) => setStockAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="text-xs font-bold"
                />
              </div>

              <Button
                type="submit"
                disabled={adjustingStock}
                className={`w-full font-bold text-xs h-10 ${
                  stockAction === "add"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-destructive hover:bg-destructive/90 text-white"
                }`}
              >
                {adjustingStock
                  ? "Updating..."
                  : stockAction === "add"
                  ? `Confirm Adding ${stockAmount} Pens`
                  : `Confirm Deducting ${stockAmount} Pens`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* PIN Reset Confirmation Modal */}
      {pinModalData && (
        <Dialog open={!!pinModalData} onOpenChange={(open) => !open && setPinModalData(null)}>
          <DialogContent className="sm:max-w-md p-5 text-center" dir="ltr">
            <DialogHeader className="text-center">
              <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
                <Key className="size-5 text-amber-500" /> New Account PIN Generated
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Access PIN updated for: {pinModalData.account.account_name}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="text-3xl font-mono font-black tracking-widest p-4 rounded-xl bg-muted/60 border text-primary">
                {pinModalData.newPin}
              </div>

              <p className="text-xs text-muted-foreground">
                Share this PIN code with the doctor or pharmacy staff to log in to the dispensing station.
              </p>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleWhatsAppShare(pinModalData.account, pinModalData.newPin)}
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold gap-2 text-xs h-10"
                >
                  <Send className="size-4" />
                  Send New PIN via WhatsApp
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleCopyPin(pinModalData.newPin)}
                  className="w-full font-semibold gap-1.5 text-xs h-9"
                >
                  {copiedPin ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  {copiedPin ? "PIN Copied!" : "Copy PIN Code"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enroll Account Modal */}
      <EnrollAccountModal
        open={isEnrollOpen}
        onOpenChange={setIsEnrollOpen}
        onSuccess={() => onRefresh()}
        repName={repName}
      />

      {/* Dispense Modal (Locked to specific account) */}
      {dispenseAccount && (
        <DispenseFormModal
          open={!!dispenseAccount}
          onOpenChange={(open) => !open && setDispenseAccount(null)}
          onSuccess={() => {
            onRefresh();
            setDispenseAccount(null);
          }}
          account={dispenseAccount}
          recordedBy={repName}
        />
      )}

      {/* Direct Dispense Modal (Choose from accounts list) */}
      <DispenseFormModal
        open={isDirectDispenseOpen}
        onOpenChange={setIsDirectDispenseOpen}
        onSuccess={() => {
          onRefresh();
          setIsDirectDispenseOpen(false);
        }}
        accountsList={accounts.filter((a) => a.current_balance > 0)}
        recordedBy={repName}
      />
    </div>
  );
}
