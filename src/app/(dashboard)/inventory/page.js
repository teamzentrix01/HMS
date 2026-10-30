"use client";
import React, { useState, useEffect } from "react";
import {
  Boxes,
  Package,
  Layers,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FileText,
  Truck,
  Plus,
  RefreshCw,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  XCircle,
  TrendingDown,
  Warehouse,
  Receipt,
  ShoppingCart,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function InventoryDashboardPage() {
  const [activeTab, setActiveTab] = useState("stock"); // stock, batches, transactions, po
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qtyDelta, setQtyDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itRes, batRes, txnRes, poRes] = await Promise.all([
        fetch("/api/inventory/items"),
        fetch("/api/inventory/batches"),
        fetch("/api/inventory/transactions"),
        fetch("/api/inventory/purchase-orders"),
      ]);
      const itData = await itRes.json();
      const batData = await batRes.json();
      const txnData = await txnRes.json();
      const poData = await poRes.json();

      if (itData.success) setItems(itData.items || []);
      if (batData.success) setBatches(batData.batches || []);
      if (txnData.success) setTransactions(txnData.transactions || []);
      if (poData.success) setPurchaseOrders(poData.purchaseOrders || []);
    } catch (err) {
      console.error("Failed to fetch inventory data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Stock Adjustment
  const handleStockAdjustment = async () => {
    if (!qtyDelta || !adjustReason) {
      alert("Please provide quantity change and reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          quantityChange: qtyDelta,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Stock adjusted successfully! New batch balance: ${data.newStock}`);
        setAdjustModalOpen(false);
        fetchData();
      } else {
        alert(data.error || "Failed to adjust stock");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive Goods against PO
  const handleReceiveGoods = async (po) => {
    if (!confirm(`Mark goods received for Purchase Order #${po.poNumber}? Stock will be added to warehouse.`)) return;

    try {
      const receiptItems = po.items.map((item) => ({
        poItemId: item.id,
        itemId: item.itemId,
        quantityReceived: item.quantityOrdered,
        unitCost: item.unitCost,
        sellingMrp: (parseFloat(item.unitCost) * 1.4).toFixed(2),
        batchNumber: `BAT-GRN-${Date.now().toString().slice(-4)}`,
        expiryDate: "2028-12-31",
      }));

      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEIVE_GOODS",
          poId: po.id,
          receiptItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Goods received and added to inventory ledger!");
        fetchData();
      } else {
        alert(data.error || "Failed to receive goods");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const filteredItems = items.filter((i) => {
    return (
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-800">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Hospital Central Store & Pharmacy Inventory
              </h1>
              <p className="text-xs text-slate-500">
                Multi-Store Stock Balance • Batch & Expiry Surveillance • Purchase Orders & Immutable Ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Inventory
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "stock"
              ? "border-indigo-700 text-indigo-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          Product Master & Balances ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "batches"
              ? "border-indigo-700 text-indigo-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Batches & Expiry ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "transactions"
              ? "border-indigo-700 text-indigo-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Stock Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab("po")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "po"
              ? "border-indigo-700 text-indigo-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* STOCK OVERVIEW TAB */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by brand, generic name, or item code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">Product Name & Generic</th>
                  <th className="p-3">Item Code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3 text-right">Available Stock</th>
                  <th className="p-3 text-right">Reorder Threshold</th>
                  <th className="p-3 text-right">MRP (₹)</th>
                  <th className="p-3 text-center">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.genericName || "—"}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-700">{item.itemCode}</td>
                    <td className="p-3 text-xs text-slate-600">{item.categoryName || "General"}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{item.uom}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{item.availableStock}</td>
                    <td className="p-3 text-right font-mono text-xs text-slate-500">{item.reorderLevel}</td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800">₹{item.sellingMrp}</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          item.stockStatus === "OUT_OF_STOCK"
                            ? "destructive"
                            : item.stockStatus === "LOW_STOCK"
                            ? "warning"
                            : "success"
                        }
                      >
                        {item.stockStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BATCHES & EXPIRY TAB */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Batch Expiry Surveillance & Store Allocation</h3>
              <span className="text-xs text-slate-500">FEFO Automated Enforcement</span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Store Location</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-center">Expiry Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{batch.itemName}</div>
                      <div className="text-xs font-mono text-slate-400">{batch.itemCode}</div>
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold text-slate-800">{batch.batchNumber}</td>
                    <td className="p-3 text-xs text-slate-600">{batch.storeName}</td>
                    <td className="p-3 font-mono text-xs text-slate-800">{batch.expiryDate}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {batch.currentStock} {batch.uom}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          batch.expiryStatus === "EXPIRED"
                            ? "destructive"
                            : batch.expiryStatus === "EXPIRING_SOON"
                            ? "warning"
                            : "success"
                        }
                      >
                        {batch.expiryStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setQtyDelta(0);
                          setAdjustReason("");
                          setAdjustModalOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK LEDGER TAB */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Immutable Inventory Transaction Journal</h3>
            <span className="text-xs text-slate-500">Real-time Stock Movements</span>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-3">Transaction #</th>
                <th className="p-3">Type</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Store</th>
                <th className="p-3 text-right">Qty Movement</th>
                <th className="p-3 text-right">Balance After</th>
                <th className="p-3">Notes</th>
                <th className="p-3 text-right">Date/Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-700">{t.transactionNumber}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          t.transactionType === "PURCHASE_RECEIPT"
                            ? "success"
                            : t.transactionType === "DISPENSE"
                            ? "secondary"
                            : "warning"
                        }
                      >
                        {t.transactionType}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{t.itemName}</td>
                    <td className="p-3 text-xs text-slate-600">{t.storeName}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={t.quantity > 0 ? "text-emerald-700" : "text-red-700"}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-800 font-semibold">{t.balanceAfter}</td>
                    <td className="p-3 text-xs text-slate-500">{t.notes || "—"}</td>
                    <td className="p-3 text-right text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === "po" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Procurement & Supplier Purchase Orders</h3>
              <span className="text-xs text-slate-500">Goods Receipt Inwarding (GRN)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {purchaseOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No active purchase orders.</div>
              ) : (
                purchaseOrders.map((po) => (
                  <div key={po.id} className="p-4 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-800 font-bold mt-1">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{po.supplierName}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {po.poNumber}
                          </span>
                          <Badge variant={po.status === "RECEIVED" ? "success" : "secondary"}>
                            {po.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Destination Store: <strong>{po.storeName}</strong> • Order Date: <strong>{po.orderDate}</strong> • Items: {po.items?.length || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">₹{po.totalAmount}</div>
                        <div className="text-[11px] text-slate-400">{po.status}</div>
                      </div>

                      {po.status !== "RECEIVED" && (
                        <Button
                          size="sm"
                          onClick={() => handleReceiveGoods(po)}
                          className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs"
                        >
                          Receive Goods (GRN)
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Physical Stock Adjustment</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Product:</span>
                <div className="font-bold text-sm text-slate-800">{selectedBatch.itemName}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-slate-500">Batch Number:</span>
                  <div className="font-mono font-semibold">{selectedBatch.batchNumber}</div>
                </div>
                <div>
                  <span className="text-slate-500">Current Stock:</span>
                  <div className="font-bold text-indigo-700">{selectedBatch.currentStock} {selectedBatch.uom}</div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Stock Change (e.g. +10 for excess found, -5 for damaged/expired)
                </label>
                <input
                  type="number"
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Justification / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Physical audit count discrepancy reconciliation..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStockAdjustment}
                disabled={isSubmitting}
                className="bg-indigo-700 hover:bg-indigo-800 text-white"
              >
                {isSubmitting ? "Adjusting..." : "Confirm Stock Adjustment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

