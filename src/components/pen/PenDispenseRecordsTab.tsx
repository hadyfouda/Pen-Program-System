import React, { useState, useMemo } from "react";
import type { DispenseRecord, AccountType } from "@/types/pen-program.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Eye,
  FileImage,
  User,
  Phone,
  CreditCard,
  Stethoscope,
  Store,
  Building2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ClipboardList,
  Download,
} from "lucide-react";

interface PenDispenseRecordsTabProps {
  records: DispenseRecord[];
  onRefresh: () => void;
}

export function PenDispenseRecordsTab({ records, onRefresh }: PenDispenseRecordsTabProps) {
  // Search & Type Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AccountType>("all");

  // Document Viewer Modal State
  const [viewRecord, setViewRecord] = useState<DispenseRecord | null>(null);
  const [activeDocType, setActiveDocType] = useState<"rx" | "id" | "consent">("rx");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter !== "all" && r.account_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPatient = r.patient_name.toLowerCase().includes(q);
        const matchPhone = r.patient_phone.includes(q);
        const matchNid = r.national_id.includes(q);
        const matchDoctor = r.prescribing_doctor.toLowerCase().includes(q);
        const matchAccount = r.account_name.toLowerCase().includes(q);
        const matchProduct = (r.product_name || "").toLowerCase().includes(q);
        const matchId = r.record_id.toLowerCase().includes(q);
        return matchPatient || matchPhone || matchNid || matchDoctor || matchAccount || matchProduct || matchId;
      }
      return true;
    });
  }, [records, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const openDocViewer = (record: DispenseRecord, docType: "rx" | "id" | "consent" = "rx") => {
    setViewRecord(record);
    setActiveDocType(docType);
    setZoom(1);
    setRotation(0);
  };

  const currentImageSrc = useMemo(() => {
    if (!viewRecord) return "";
    if (activeDocType === "rx") return viewRecord.rx_image_id;
    if (activeDocType === "id") return viewRecord.id_image_id;
    if (activeDocType === "consent") return viewRecord.consent_image_id;
    return "";
  }, [viewRecord, activeDocType]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      "Record ID",
      "Date",
      "Facility Name",
      "Facility Type",
      "Prescribing Doctor",
      "Patient Name",
      "Phone",
      "National ID",
      "Product Name",
      "Dispensed Qty",
      "Recorded By",
      "Is Exception",
      "Notes",
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.record_id}"`,
      `"${new Date(r.created_at).toISOString().slice(0, 10)}"`,
      `"${r.account_name.replace(/"/g, '""')}"`,
      `"${r.account_type}"`,
      `"${r.prescribing_doctor.replace(/"/g, '""')}"`,
      `"${r.patient_name.replace(/"/g, '""')}"`,
      `"${r.patient_phone}"`,
      `"${r.national_id}"`,
      `"${(r.product_name || "Regular Insulin").replace(/"/g, '""')}"`,
      r.dispensed_qty || 1,
      `"${r.recorded_by.replace(/"/g, '""')}"`,
      r.is_exception ? "Yes" : "No",
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EVA_Insulin_Dispense_Records_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" dir="ltr">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Dispense Records & Supporting Documents
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit patient dispensing, dispensed insulin formulations, and review uploaded prescriptions and National IDs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
            Total Dispensed: {records.reduce((acc, curr) => acc + (curr.dispensed_qty || 1), 0)} pens
          </Badge>

          {records.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-semibold h-8 gap-1.5"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-3 rounded-xl border bg-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              placeholder="Search by patient name, phone, National ID, doctor, insulin brand, or record ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="text-xs pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Facilities" },
              { id: "private_clinic", label: "Clinics" },
              { id: "pharmacy", label: "Pharmacies" },
              { id: "medical_center", label: "Medical Centers" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setTypeFilter(f.id as any);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition shrink-0 ${
                  typeFilter === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content View */}
        {records.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed bg-muted/20 space-y-3">
            <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ClipboardList className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No dispensing records logged yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              When a clinic, pharmacy, or representative records a dispense with an attached prescription, it will appear here immediately with high-resolution audit verification.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            No dispensing records matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-2.5">Record ID / Date</th>
                  <th className="p-2.5">Facility</th>
                  <th className="p-2.5">Physician</th>
                  <th className="p-2.5">Patient Details</th>
                  <th className="p-2.5">National ID</th>
                  <th className="p-2.5">Insulin Product</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5">Logged By</th>
                  <th className="p-2.5 text-center">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedRecords.map((r) => (
                  <tr key={r.record_id} className="hover:bg-muted/20 transition">
                    <td className="p-2.5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{r.record_id}</span>
                        {r.is_exception && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] py-0 px-1">
                            Exception
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(r.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {r.account_type === "private_clinic" ? (
                          <Stethoscope className="size-3.5 text-primary shrink-0" />
                        ) : r.account_type === "pharmacy" ? (
                          <Store className="size-3.5 text-primary shrink-0" />
                        ) : (
                          <Building2 className="size-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-semibold text-foreground line-clamp-1">
                          {r.account_name}
                        </span>
                      </div>
                    </td>

                    <td className="p-2.5 font-medium">{r.prescribing_doctor}</td>

                    <td className="p-2.5">
                      <div className="font-bold text-foreground">{r.patient_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {r.patient_phone}
                      </div>
                    </td>

                    <td className="p-2.5 font-mono font-medium text-[11px] text-muted-foreground tracking-wider">
                      {r.national_id}
                    </td>

                    <td className="p-2.5 font-semibold text-primary">
                      {r.product_name || "Regular Insulin"}
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge className="font-bold text-[10px] px-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                        {r.dispensed_qty} pens
                      </Badge>
                    </td>

                    <td className="p-2.5 text-muted-foreground text-[11px]">
                      {r.recorded_by}
                    </td>

                    <td className="p-2.5 text-center">
                      {r.rx_image_id || r.id_image_id || r.consent_image_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDocViewer(r, "rx")}
                          className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Eye className="size-3.5" />
                          View Docs
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({filteredRecords.length} records)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Secure Document Viewer Modal */}
      {viewRecord && (
        <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-4 sm:p-6" dir="ltr">
            <DialogHeader className="text-left pb-2 border-b">
              <DialogTitle className="text-sm sm:text-base font-bold flex items-center justify-between">
                <span>Supporting Documents — {viewRecord.patient_name}</span>
                <span className="text-xs font-mono font-normal text-muted-foreground">
                  ID: {viewRecord.record_id}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Doc Tabs Switcher */}
            <div className="flex items-center gap-2 pt-2 border-b pb-2">
              <Button
                size="sm"
                variant={activeDocType === "rx" ? "default" : "outline"}
                onClick={() => {
                  setActiveDocType("rx");
                  setZoom(1);
                  setRotation(0);
                }}
                className="text-xs h-8 font-semibold"
              >
                Medical Prescription (Rx)
              </Button>

              <Button
                size="sm"
                variant={activeDocType === "id" ? "default" : "outline"}
                onClick={() => {
                  setActiveDocType("id");
                  setZoom(1);
                  setRotation(0);
                }}
                className="text-xs h-8 font-semibold"
              >
                National ID
              </Button>

              {viewRecord.consent_image_id && (
                <Button
                  size="sm"
                  variant={activeDocType === "consent" ? "default" : "outline"}
                  onClick={() => {
                    setActiveDocType("consent");
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="text-xs h-8 font-semibold"
                >
                  Receipt / Consent
                </Button>
              )}

              {/* Zoom & Rotation Controls */}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate Image"
                >
                  <RotateCw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="flex-1 min-h-[300px] max-h-[55vh] overflow-auto flex items-center justify-center p-3 bg-muted/20 rounded-lg mt-2 border">
              {currentImageSrc ? (
                <img
                  src={currentImageSrc}
                  alt={activeDocType}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                  className="max-h-[50vh] max-w-full object-contain rounded shadow-xs"
                />
              ) : (
                <div className="text-center text-muted-foreground text-xs space-y-1">
                  <FileImage className="size-8 mx-auto text-muted-foreground/50" />
                  <span>No image available for this document</span>
                </div>
              )}
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
              <span>Physician: {viewRecord.prescribing_doctor}</span>
              <span>Facility: {viewRecord.account_name}</span>
              <span>Product: {viewRecord.product_name}</span>
              <span>National ID: {viewRecord.national_id}</span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
