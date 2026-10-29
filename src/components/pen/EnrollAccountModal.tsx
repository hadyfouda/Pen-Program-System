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
import { useIsMobile } from "@/hooks/use-mobile";
import { penService } from "@/lib/onedrive-pen.service";
import type { AccountType, EnrolledAccount } from "@/types/pen-program.types";
import { toast } from "sonner";
import {
  Stethoscope,
  Store,
  Building2,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Send,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { EGYPT_REGIONS_DATA, ALL_BRICK_NAMES } from "@/data/egypt-bricks";

interface EnrollAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newAccount: EnrolledAccount) => void;
  repName?: string;
  assignedBricks?: string[];
}

export function EnrollAccountModal({
  open,
  onOpenChange,
  onSuccess,
  repName = "Field Representative",
  assignedBricks = [],
}: EnrollAccountModalProps) {
  const isMobile = useIsMobile();

  // Form State
  const [accountType, setAccountType] = useState<AccountType>("private_clinic");
  const [accountName, setAccountName] = useState("");
  const [specialty, setSpecialty] = useState("Endocrinology & Diabetes");
  const [territory, setTerritory] = useState(assignedBricks[0] || ALL_BRICK_NAMES[0]);
  const [phone, setPhone] = useState("");
  const [allocatedPens, setAllocatedPens] = useState<number>(10);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Success State for WhatsApp sharing
  const [createdAccount, setCreatedAccount] = useState<EnrolledAccount | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  // Auto-generate 6-digit PIN on open
  useEffect(() => {
    if (open && !createdAccount) {
      generateNewPin();
      if (assignedBricks.length > 0 && !assignedBricks.includes(territory)) {
        setTerritory(assignedBricks[0]);
      }
    }
  }, [open, assignedBricks]);

  const generateNewPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(randomPin);
  };

  const handleReset = () => {
    setAccountType("private_clinic");
    setAccountName("");
    setSpecialty("Endocrinology & Diabetes");
    setTerritory(assignedBricks[0] || ALL_BRICK_NAMES[0]);
    setPhone("");
    setAllocatedPens(10);
    setCreatedAccount(null);
    setCopiedPin(false);
    generateNewPin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast.error("Please enter the physician or pharmacy name");
      return;
    }
    if (!territory.trim()) {
      toast.error("Please enter the territory or governorate");
      return;
    }
    if (assignedBricks.length > 0 && !assignedBricks.includes(territory)) {
      toast.error("Please select a territory within your assigned Bricks.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      toast.error("PIN code must be exactly 6 digits");
      return;
    }

    setLoading(true);
    try {
      const newAcc = await penService.enrollAccount({
        account_type: accountType,
        account_name: accountName,
        specialty: accountType === "private_clinic" ? specialty : undefined,
        territory,
        phone,
        enrolled_by_rep: repName,
        pin,
        initial_allocated_pens: Number(allocatedPens) || 0,
      });

      setCreatedAccount(newAcc);
      onSuccess(newAcc);
      toast.success(`Enrolled "${accountName}" with an initial quota of ${allocatedPens} pens`);
    } catch {
      toast.error("An error occurred while saving facility data");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    toast.success("PIN copied to clipboard");
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!createdAccount) return;
    const base = window.location.origin + window.location.pathname;
    const portalUrl = `${base.replace(/\/$/, "")}?portal=true`;

    const msg = `Dear ${createdAccount.account_name},\n\nYour facility has been successfully enrolled in the EVA Insulin Pen Program.\n\n🔑 Secure Access PIN: *${createdAccount.raw_pin || pin}*\n📦 Initial Pen Stock: *${createdAccount.allocated_pens} Pens*\n\n🌐 Dedicated Dispensing Station Portal:\n${portalUrl}\n\nYou may log in using your 6-digit PIN to record patient dispensations and request stock replenishment.`;

    const cleanPhone = createdAccount.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("01") ? `2${cleanPhone}` : cleanPhone;
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const formBody = createdAccount ? (
    <div className="space-y-4 py-2" dir="ltr">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
        <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <Check className="size-6" />
        </div>
        <h3 className="font-bold text-base text-foreground">Facility Enrolled Successfully!</h3>
        <p className="text-xs text-muted-foreground">
          Initial stock allocation of <span className="font-bold text-foreground">{createdAccount.allocated_pens} pens</span> assigned to:
        </p>
        <p className="font-bold text-sm text-primary">{createdAccount.account_name}</p>
      </div>

      {/* PIN Box */}
      <div className="p-3.5 rounded-lg border bg-muted/30 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground block">Assigned Secure PIN</span>
          <span className="text-xl font-mono font-black text-foreground tracking-widest">{createdAccount.raw_pin || pin}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyPin}
          className="gap-1.5 text-xs font-medium"
        >
          {copiedPin ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          {copiedPin ? "Copied" : "Copy PIN"}
        </Button>
      </div>

      {/* Share Actions */}
      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleWhatsAppShare}
          className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold gap-2 text-xs h-10 shadow-sm"
        >
          <Send className="size-4" />
          Send Portal Link & PIN via WhatsApp
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-xs font-semibold"
          >
            + Enroll Another Facility
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              handleReset();
            }}
            className="text-xs font-semibold"
          >
            Close Window
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-3.5 py-1" dir="ltr">
      {/* Account Type Selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Facility Type *</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAccountType("private_clinic")}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 items-start ${
              accountType === "private_clinic"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Stethoscope className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-bold leading-tight">Private Clinic</span>
            <span className="text-[10px] opacity-75">Doctor's Clinic</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("pharmacy")}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 items-start ${
              accountType === "pharmacy"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Store className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-bold leading-tight">Pharmacy</span>
            <span className="text-[10px] opacity-75">Retail Pharmacy</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("medical_center")}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 items-start ${
              accountType === "medical_center"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Building2 className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-bold leading-tight">Medical Center</span>
            <span className="text-[10px] opacity-75">Hospital / Poly</span>
          </button>
        </div>
      </div>

      {/* Account Name */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-foreground">
          {accountType === "private_clinic"
            ? "Doctor's Name & Title *"
            : accountType === "pharmacy"
            ? "Pharmacy Name *"
            : "Medical Center Name *"}
        </Label>
        <Input
          placeholder={
            accountType === "private_clinic"
              ? "e.g. Dr. Ahmed Mostafa"
              : accountType === "pharmacy"
              ? "e.g. Care Pharmacy - Downtown"
              : "e.g. Al-Amal Diabetes Center"
          }
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
          className="text-xs"
        />
      </div>

      {/* Specialty for Clinic */}
      {accountType === "private_clinic" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Medical Specialty</Label>
          <Input
            placeholder="e.g. Endocrinology & Diabetes, Internal Medicine..."
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="text-xs"
          />
        </div>
      )}

      {/* Territory & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Territory / Brick *</span>
            {assignedBricks.length > 0 ? (
              <span className="text-[10px] text-primary font-semibold">
                {assignedBricks.length} Assigned Brick{assignedBricks.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-normal">All Egypt Bricks</span>
            )}
          </Label>
          <div className="relative">
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              required
              className="w-full text-xs p-2 rounded-lg border bg-background font-mono font-semibold appearance-none pr-8 cursor-pointer"
            >
              {assignedBricks.length > 0 ? (
                assignedBricks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))
              ) : (
                EGYPT_REGIONS_DATA.map((reg) => (
                  <optgroup key={reg.region} label={reg.region}>
                    {reg.sectors.flatMap((sec) =>
                      sec.bricks.map((b) => (
                        <option key={b} value={b}>
                          {b} ({sec.sector})
                        </option>
                      ))
                    )}
                  </optgroup>
                ))
              )}
            </select>
            <ChevronDown className="size-3.5 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Mobile Number (WhatsApp) *</Label>
          <Input
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* Initial Stock & PIN */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Initial Pen Quota *</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={allocatedPens}
            onChange={(e) => setAllocatedPens(Math.max(1, parseInt(e.target.value) || 1))}
            required
            className="text-xs font-bold"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-foreground">Access PIN (6 Digits) *</Label>
            <button
              type="button"
              onClick={generateNewPin}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              <RefreshCw className="size-2.5" />
              Generate
            </button>
          </div>
          <div className="relative">
            <Input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="text-xs font-mono font-bold tracking-widest text-center"
            />
            <KeyRound className="size-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Rep info banner */}
      <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Enrolling Representative:</span>
        <span className="font-semibold text-foreground">{repName}</span>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full font-bold text-xs h-10 shadow-sm"
      >
        {loading ? "Registering..." : "Confirm Facility Enrollment & Save"}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-4 max-h-[92vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Enroll Facility in EVA Pen Program
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Register a participating clinic or pharmacy, assign initial inventory, and dispatch their PIN.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-1">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5" dir="ltr">
        <DialogHeader className="text-left pb-1">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="size-5 text-primary" /> Enroll Facility in EVA Pen Program
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a participating clinic or pharmacy, assign initial inventory, and dispatch their PIN.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
