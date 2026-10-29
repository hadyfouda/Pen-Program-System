import React, { useState, useMemo } from "react";
import {
  EGYPT_REGIONS_DATA,
  ALL_EGYPT_BRICKS,
  type RegionGroup,
} from "@/data/egypt-bricks";
import type { CorporateRole } from "@/lib/corporate-auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  Search,
  Check,
  CheckCircle2,
  X,
  UserCheck,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface TerritorySelectionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  initialRole?: CorporateRole;
  initialBricks?: string[];
  userEmail: string;
  userName?: string;
  isFirstTime?: boolean;
  onSave: (role: CorporateRole, assignedBricks: string[]) => void;
}

// Clean English region labels
function getRegionEnglishName(rawName: string): string {
  if (rawName.includes("Cairo")) return "Cairo";
  if (rawName.includes("Giza")) return "Giza";
  if (rawName.includes("Alexandria") || rawName.includes("Matrouh")) return "Alexandria & Matrouh";
  if (rawName.includes("Delta")) return "Delta";
  if (rawName.includes("Upper Egypt") || rawName.includes("الصعيد")) return "Upper Egypt";
  if (rawName.includes("Canal") || rawName.includes("Sinai")) return "Canal & Sinai";
  return rawName;
}

export function TerritorySelectionDialog({
  open,
  onOpenChange,
  initialRole = "Medical Rep",
  initialBricks = [],
  userEmail,
  userName = "Colleague",
  isFirstTime = false,
  onSave,
}: TerritorySelectionDialogProps) {
  const [role, setRole] = useState<CorporateRole>(initialRole);
  const [selectedBricks, setSelectedBricks] = useState<string[]>(initialBricks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegionIndex, setSelectedRegionIndex] = useState(0);

  // Toggle single brick
  const toggleBrick = (brickName: string) => {
    setSelectedBricks((prev) =>
      prev.includes(brickName)
        ? prev.filter((b) => b !== brickName)
        : [...prev, brickName]
    );
  };

  // Select all in sector
  const toggleSector = (bricksInSector: string[]) => {
    const allSelected = bricksInSector.every((b) => selectedBricks.includes(b));
    if (allSelected) {
      setSelectedBricks((prev) => prev.filter((b) => !bricksInSector.includes(b)));
    } else {
      setSelectedBricks((prev) => Array.from(new Set([...prev, ...bricksInSector])));
    }
  };

  // Select all in region
  const toggleRegion = (reg: RegionGroup) => {
    const allBricksInRegion = reg.sectors.flatMap((s) => s.bricks);
    const allSelected = allBricksInRegion.every((b) => selectedBricks.includes(b));
    if (allSelected) {
      setSelectedBricks((prev) => prev.filter((b) => !allBricksInRegion.includes(b)));
    } else {
      setSelectedBricks((prev) => Array.from(new Set([...prev, ...allBricksInRegion])));
    }
  };

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return ALL_EGYPT_BRICKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.sector.toLowerCase().includes(q) ||
        b.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeRegion = EGYPT_REGIONS_DATA[selectedRegionIndex] || EGYPT_REGIONS_DATA[0];
  const activeRegionName = getRegionEnglishName(activeRegion.region);

  const handleConfirm = () => {
    if (selectedBricks.length === 0 && role !== "Program Administrator") {
      toast.error("Please select at least one assigned Brick to proceed.");
      return;
    }

    onSave(role, selectedBricks);
    toast.success(
      `Saved and assigned ${selectedBricks.length} Bricks under ${
        role === "District Manager" ? "District Manager (DM)" : "Medical Rep (MR)"
      } role.`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden"
        dir="ltr"
      >
        <DialogHeader className="text-left pb-2 border-b">
          <div className="flex items-center gap-2 text-primary mb-1">
            <MapPin className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isFirstTime ? "Role & Territory Setup" : "Update Territory & Assigned Bricks"}
            </span>
          </div>
          <DialogTitle className="text-lg font-black text-foreground">
            Select Your Role & Assigned Areas (Egypt Bricks)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Welcome, <strong>{userName}</strong> ({userEmail}). Under EVA Pharma data governance, your account will strictly access clinics, pharmacies, and pen allocations within your assigned territories.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 pl-1">
          {/* 1. ROLE SELECTION */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Briefcase className="size-4 text-primary" />
              1. Select your corporate role in the program:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("Medical Rep")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  role === "Medical Rep"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/30 text-foreground"
                }`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    role === "Medical Rep"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Medical Representative (MR)</span>
                    {role === "Medical Rep" && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                    Field Representative — Responsible for clinic visits and pen allocations in specific assigned bricks.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("District Manager")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  role === "District Manager"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/30 text-foreground"
                }`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    role === "District Manager"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Briefcase className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>District Manager (DM)</span>
                    {role === "District Manager" && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                    District Manager — Supervisory access overseeing multiple sectors, teams, and bricks under your district.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. BRICK SELECTION */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" />
                2. Select your assigned areas and Bricks:
              </Label>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Selected:</span>
                <Badge className="font-bold font-mono bg-primary text-primary-foreground">
                  {selectedBricks.length} Bricks
                </Badge>
                {selectedBricks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBricks([])}
                    className="text-[11px] text-destructive hover:underline ml-1 font-medium cursor-pointer"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Brick or sector name (e.g. FAISAL, HELIOPOLIS, DAKHLEIAH, ASSUIT)..."
                className="text-xs pl-9 h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* SEARCH VIEW OR REGION TABS VIEW */}
            {searchResults ? (
              <div className="border rounded-xl p-3 bg-muted/20 space-y-2 max-h-64 overflow-y-auto">
                <div className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                  <span>Search Results ({searchResults.length} Bricks)</span>
                  {searchResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const names = searchResults.map((r) => r.name);
                        setSelectedBricks((prev) => Array.from(new Set([...prev, ...names])));
                      }}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Select All Results
                    </button>
                  )}
                </div>

                {searchResults.length === 0 ? (
                  <p className="text-xs text-center py-4 text-muted-foreground">
                    No bricks found matching "{searchQuery}"
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {searchResults.map((b) => {
                      const isSelected = selectedBricks.includes(b.name);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBrick(b.name)}
                          className={`p-2 rounded-lg border text-left text-xs transition flex items-center justify-between gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-background hover:bg-muted/40 text-foreground border-border"
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate font-mono text-[11px]">{b.name}</span>
                            <span className={`text-[9px] block ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {getRegionEnglishName(b.region)}
                            </span>
                          </div>
                          {isSelected && <Check className="size-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-xl bg-card overflow-hidden">
                {/* Region Selector Pills */}
                <div className="flex border-b overflow-x-auto bg-muted/30 p-1.5 gap-1 text-xs">
                  {EGYPT_REGIONS_DATA.map((reg, idx) => {
                    const countInRegion = reg.sectors
                      .flatMap((s) => s.bricks)
                      .filter((b) => selectedBricks.includes(b)).length;
                    const englishName = getRegionEnglishName(reg.region);
                    return (
                      <button
                        key={reg.region}
                        type="button"
                        onClick={() => setSelectedRegionIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap text-xs transition flex items-center gap-1.5 cursor-pointer ${
                          selectedRegionIndex === idx
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{englishName}</span>
                        {countInRegion > 0 && (
                          <span
                            className={`size-4 rounded-full text-[9px] flex items-center justify-center font-mono ${
                              selectedRegionIndex === idx
                                ? "bg-primary-foreground text-primary"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {countInRegion}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Region Content with Sectors & Bricks */}
                <div className="p-3.5 space-y-3 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs font-bold text-foreground">
                      {activeRegionName} Sectors ({activeRegion.sectors.length} sectors)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRegion(activeRegion)}
                      className="text-xs h-7 text-primary hover:text-primary font-bold cursor-pointer"
                    >
                      {activeRegion.sectors.flatMap((s) => s.bricks).every((b) => selectedBricks.includes(b))
                        ? "Deselect Whole Region"
                        : "Select Whole Region"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {activeRegion.sectors.map((sec) => {
                      const allInSector = sec.bricks.every((b) => selectedBricks.includes(b));
                      return (
                        <div key={sec.sector} className="p-2.5 rounded-xl border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-foreground font-mono flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-primary" />
                              {sec.sector}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSector(sec.bricks)}
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              {allInSector ? "Deselect Sector" : "Select Sector"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                            {sec.bricks.map((brick) => {
                              const isSelected = selectedBricks.includes(brick);
                              return (
                                <button
                                  key={brick}
                                  type="button"
                                  onClick={() => toggleBrick(brick)}
                                  className={`p-2 rounded-lg border text-left text-xs transition flex items-center justify-between gap-1 cursor-pointer ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                      : "bg-background hover:bg-muted/50 text-foreground border-border font-medium"
                                  }`}
                                >
                                  <span className="font-mono text-[11px] truncate">{brick}</span>
                                  {isSelected && <Check className="size-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Bricks Preview Chips */}
          {selectedBricks.length > 0 && (
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
              <span className="text-[11px] font-bold text-foreground block">
                Summary of Assigned Bricks ({selectedBricks.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedBricks.map((brick) => (
                  <Badge
                    key={brick}
                    variant="secondary"
                    className="text-[10px] font-mono gap-1 pl-2 pr-1 py-0.5"
                  >
                    {brick}
                    <button
                      type="button"
                      onClick={() => toggleBrick(brick)}
                      className="hover:text-destructive size-3.5 rounded-full inline-flex items-center justify-center cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="size-4 text-emerald-600 shrink-0" />
            <span>Facilities and pens outside these assigned territories will be completely hidden from your view.</span>
          </div>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedBricks.length === 0}
            className="w-full sm:w-auto font-bold gap-2 text-xs h-10 px-5 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            Confirm Role & Territories
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
