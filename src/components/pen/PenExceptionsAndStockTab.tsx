import React, { useState } from "react";
import type { StockRequest, DispenseException } from "@/types/pen-program.types";
import { penService } from "@/lib/onedrive-pen.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  Building2,
  Stethoscope,
  Store,
  Check,
  X,
} from "lucide-react";

interface PenExceptionsAndStockTabProps {
  stockRequests: StockRequest[];
  exceptions: DispenseException[];
  onRefresh: () => void;
  isAdmin?: boolean;
}

export function PenExceptionsAndStockTab({
  stockRequests,
  exceptions,
  onRefresh,
  isAdmin = true,
}: PenExceptionsAndStockTabProps) {
  // Review Modals
  const [activeStockReq, setActiveStockReq] = useState<StockRequest | null>(null);
  const [approvedQty, setApprovedQty] = useState<number>(10);
  const [stockAdminNotes, setStockAdminNotes] = useState("");
  const [processingStock, setProcessingStock] = useState(false);

  const [activeException, setActiveException] = useState<DispenseException | null>(null);
  const [exceptionAdminNotes, setExceptionAdminNotes] = useState("");
  const [processingException, setProcessingException] = useState(false);

  // Stock Review Handler
  const handleStockDecision = async (action: "approve" | "reject") => {
    if (!activeStockReq) return;
    setProcessingStock(true);
    try {
      await penService.reviewStockRequest(
        activeStockReq.request_id,
        action,
        action === "approve" ? approvedQty : 0,
        stockAdminNotes
      );
      toast.success(
        action === "approve"
          ? `Approved supply of ${approvedQty} pens for "${activeStockReq.account_name}". Balance updated.`
          : `Replenishment request rejected for "${activeStockReq.account_name}".`
      );
      setActiveStockReq(null);
      onRefresh();
    } catch {
      toast.error("An error occurred while processing stock request");
    } finally {
      setProcessingStock(false);
    }
  };

  // Exception Decision Handler
  const handleExceptionDecision = async (action: "approve" | "reject") => {
    if (!activeException) return;
    setProcessingException(true);
    try {
      await penService.reviewException(
        activeException.exception_id,
        action,
        exceptionAdminNotes
      );
      toast.success(
        action === "approve"
          ? `Patient exception approved for "${activeException.patient_name}". The facility can now dispense the pen.`
          : "Exception request rejected."
      );
      setActiveException(null);
      onRefresh();
    } catch {
      toast.error("An error occurred while processing exception request");
    } finally {
      setProcessingException(false);
    }
  };

  const pendingStockCount = stockRequests.filter((r) => r.status === "pending").length;
  const pendingExceptionCount = exceptions.filter((e) => e.admin_status === "pending").length;

  return (
    <div className="space-y-6" dir="ltr">
      {/* SECTION 1: Stock Replenishment Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Stock Replenishment Requests
            </h3>
            {pendingStockCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                {pendingStockCount} Pending
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Excel: Tbl_Stock_Requests</span>
        </div>

        {stockRequests.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
            <Package className="size-8 mx-auto text-muted-foreground/60" />
            <p className="text-xs font-bold text-foreground">No stock requests submitted yet</p>
            <p className="text-[11px] text-muted-foreground">
              Clinics and pharmacies can submit replenishment requests directly from their dispensing station when stock runs low.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stockRequests.map((req) => (
              <div
                key={req.request_id}
                className="p-3.5 rounded-xl border bg-card space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {req.account_type === "private_clinic" ? (
                          <Stethoscope className="size-3.5" />
                        ) : req.account_type === "pharmacy" ? (
                          <Store className="size-3.5" />
                        ) : (
                          <Building2 className="size-3.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-foreground line-clamp-1">{req.account_name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">{req.request_id}</span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        req.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : req.status === "rejected"
                          ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                      }
                    >
                      {req.status === "approved"
                        ? "Approved"
                        : req.status === "rejected"
                        ? "Rejected"
                        : "Under Review"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <div>
                      <span className="block text-[10px]">Requested Qty:</span>
                      <span className="font-bold text-foreground text-xs">{req.requested_qty} pens</span>
                    </div>
                    <div>
                      <span className="block text-[10px]">Requested By:</span>
                      <span className="font-medium text-foreground text-xs">{req.requested_by}</span>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded">
                      <span className="font-semibold text-foreground">Notes:</span> {req.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[10px]">
                  <span className="text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString("en-US")}
                  </span>

                  {req.status === "pending" && isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveStockReq(req);
                        setApprovedQty(req.requested_qty);
                        setStockAdminNotes("");
                      }}
                      className="h-7 text-[11px] font-bold"
                    >
                      Review & Decide
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Dispense Exceptions */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Patient Dispense Exceptions & Overrides
            </h3>
            {pendingExceptionCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                {pendingExceptionCount} Awaiting Decision
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Excel: Tbl_Exceptions</span>
        </div>

        {exceptions.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
            <AlertTriangle className="size-8 mx-auto text-muted-foreground/60" />
            <p className="text-xs font-bold text-foreground">No patient exceptions filed</p>
            <p className="text-[11px] text-muted-foreground">
              Exceptional dispense requests (such as damaged/lost pens or early refills) submitted by pharmacies or clinics will appear here for review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exceptions.map((exc) => (
              <div
                key={exc.exception_id}
                className="p-3.5 rounded-xl border bg-card space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{exc.patient_name || exc.account_name}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono">{exc.exception_id} • Facility: {exc.account_name}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        exc.admin_status === "fulfilled"
                          ? "bg-sky-500/10 text-sky-600 border-sky-500/20 text-[10px]"
                          : exc.admin_status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : exc.admin_status === "rejected"
                          ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                      }
                    >
                      {exc.admin_status === "fulfilled"
                        ? "Dispensed"
                        : exc.admin_status === "approved"
                        ? "Approved — Pending Dispense"
                        : exc.admin_status === "rejected"
                        ? "Rejected"
                        : "Awaiting Review"}
                    </Badge>
                  </div>

                  <div className="text-[11px] bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Product & Qty:</span>
                      <span className="font-bold text-primary">
                        {exc.product_name} ({exc.pens_count} pens)
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Patient Phone:</span>
                      <span className="font-mono font-bold text-foreground">
                        {exc.patient_phone}
                      </span>
                    </div>

                    {exc.national_id && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>National ID:</span>
                        <span className="font-mono font-bold text-foreground">
                          {exc.national_id}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Reason for Exception:</span>
                      <p className="font-medium text-foreground mt-0.5">{exc.exception_reason}</p>
                    </div>
                  </div>

                  {exc.admin_notes && (
                    <p className="text-[10px] text-muted-foreground bg-primary/5 p-2 rounded border border-primary/10">
                      <span className="font-semibold text-primary">Admin Decision:</span> {exc.admin_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[10px]">
                  <span className="text-muted-foreground">
                    {new Date(exc.created_at).toLocaleDateString("en-US")}
                  </span>

                  {exc.admin_status === "pending" && isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveException(exc);
                        setExceptionAdminNotes("");
                      }}
                      className="h-7 text-[11px] font-bold"
                    >
                      Take Decision
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Stock Request Dialog */}
      {activeStockReq && (
        <Dialog open={!!activeStockReq} onOpenChange={(open) => !open && setActiveStockReq(null)}>
          <DialogContent className="sm:max-w-md p-5" dir="ltr">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Package className="size-5 text-primary" /> Review Stock Replenishment Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Request submitted by: {activeStockReq.account_name} ({activeStockReq.requested_qty} pens requested)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Approved Quantity (Pens)</Label>
                <Input
                  type="number"
                  min={1}
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Admin Notes & Delivery Instructions</Label>
                <Input
                  value={stockAdminNotes}
                  onChange={(e) => setStockAdminNotes(e.target.value)}
                  placeholder="e.g. Approved for field rep delivery next week..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => handleStockDecision("approve")}
                  disabled={processingStock}
                  className="font-bold gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="size-4" />
                  Approve & Credit Balance
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStockDecision("reject")}
                  disabled={processingStock}
                  className="font-semibold gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <X className="size-4" />
                  Reject Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Exception Dialog */}
      {activeException && (
        <Dialog open={!!activeException} onOpenChange={(open) => !open && setActiveException(null)}>
          <DialogContent className="sm:max-w-md p-5" dir="ltr">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" /> Patient Exception Decision
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Request from {activeException.account_name} for patient: {activeException.patient_name} ({activeException.product_name})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                <span className="font-semibold block text-foreground">Provided Medical Justification:</span>
                <p className="text-muted-foreground">{activeException.exception_reason}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Admin Decision Notes</Label>
                <Input
                  value={exceptionAdminNotes}
                  onChange={(e) => setExceptionAdminNotes(e.target.value)}
                  placeholder="Approval terms or reason for refusal..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => handleExceptionDecision("approve")}
                  disabled={processingException}
                  className="font-bold gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="size-4" />
                  Approve Exception
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExceptionDecision("reject")}
                  disabled={processingException}
                  className="font-semibold gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <X className="size-4" />
                  Reject Exception
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
