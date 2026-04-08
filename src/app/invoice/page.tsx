"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  Modal,
  FormGroup,
  Input,
  Select,
  Textarea,
  StatCard,
  Loading,
  Empty,
  Grid,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const INV_COLOR: Record<string, string> = {
  UNPAID: "yellow",
  PARTIAL: "orange",
  PAID: "green",
  OVERDUE: "red",
};

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    dueDate: "",
    notes: "",
    items: [{ description: "", qty: "1", rate: "", gstPct: "18" }],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([invs, cls]) => {
      setInvoices(Array.isArray(invs) ? invs : []);
      setCustomers(Array.isArray(cls) ? cls : []);
      setLoading(false);
    });
  }, []);

  function addItem() {
    setForm((p) => ({
      ...p,
      items: [
        ...p.items,
        { description: "", qty: "1", rate: "", gstPct: "18" },
      ],
    }));
  }
  function removeItem(i: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }
  function updateItem(i: number, k: string, v: string) {
    setForm((p) => {
      const items = [...p.items];
      items[i] = { ...items[i], [k]: v };
      return { ...p, items };
    });
  }

  const subTotal = form.items.reduce(
    (s, item) => s + (parseFloat(item.rate) || 0) * (parseInt(item.qty) || 0),
    0,
  );
  const gstTotal = form.items.reduce((s, item) => {
    const amt = (parseFloat(item.rate) || 0) * (parseInt(item.qty) || 0);
    return s + (amt * (parseFloat(item.gstPct) || 18)) / 100;
  }, 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const inv = await res.json();
      setInvoices((p) => [inv, ...p]);
      setShowModal(false);
      setForm({
        customerId: "",
        dueDate: "",
        notes: "",
        items: [{ description: "", qty: "1", rate: "", gstPct: "18" }],
      });
      toast.success(`Invoice ${inv.invNo} created!`);
    } catch {
      toast.error("Failed to create invoice");
    }
    setSaving(false);
  }

  const counts = {
    total: invoices.length,
    billed: invoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
    unpaid: invoices.reduce(
      (s, i) => s + ((i.totalAmount || 0) - (i.paidAmount || 0)),
      0,
    ),
    overdue: invoices.filter((i) => i.status === "OVERDUE").length,
  };

  return (
    <PageShell
      title="Invoices"
      action={{ label: "+ New Invoice", onClick: () => setShowModal(true) }}
    >
      <div className="animate-in">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Total Invoices"
            value={counts.total}
            icon="🧾"
            color="blue"
          />
          <StatCard
            label="Total Billed"
            value={formatCurrency(counts.billed)}
            icon="💰"
            color="green"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(counts.unpaid)}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            label="Overdue"
            value={counts.overdue}
            icon="🚨"
            color="red"
          />
        </div>

        <Grid cols={2} gap={16}>
          <Card>
            <CardHeader>
              <CardTitle>Invoice List</CardTitle>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                + New Invoice
              </Button>
            </CardHeader>
            {loading ? (
              <Loading />
            ) : invoices.length === 0 ? (
              <Empty message="No invoices yet" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Inv No.</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td
                          style={{
                            color: "#3b82f6",
                            fontFamily: "monospace",
                            fontSize: 11,
                          }}
                        >
                          {inv.invNo}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {inv.customer?.name}
                        </td>
                        <td style={{ color: "#10b981", fontWeight: 600 }}>
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td style={{ color: "#3b82f6" }}>
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td style={{ color: "#8892a4", fontSize: 11 }}>
                          {formatDate(inv.dueDate)}
                        </td>
                        <td>
                          <Badge color={INV_COLOR[inv.status]}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td>
                          <Button size="sm" onClick={() => setPreview(inv)}>
                            Preview
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Preview</CardTitle>
              {preview && (
                <Button onClick={() => window.print()}>🖨️ Print</Button>
              )}
            </CardHeader>
            <CardBody>
              {!preview ? (
                <Empty message="Select an invoice to preview" />
              ) : (
                <div id="inv-print">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: "1px solid #2a3348",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#3b82f6",
                        }}
                      >
                        {process.env.NEXT_PUBLIC_SHOP_NAME || "PrintFlow"}
                      </div>
                      <div
                        style={{ fontSize: 10, color: "#8892a4", marginTop: 3 }}
                      >
                        {process.env.NEXT_PUBLIC_SHOP_ADDRESS}
                      </div>
                      <div style={{ fontSize: 10, color: "#8892a4" }}>
                        GST: {process.env.NEXT_PUBLIC_SHOP_GST}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        color: "#8892a4",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#e2e8f0",
                        }}
                      >
                        INVOICE
                      </div>
                      <div>
                        No: <b style={{ color: "#3b82f6" }}>{preview.invNo}</b>
                      </div>
                      <div>Date: {formatDate(preview.date)}</div>
                      <div>Due: {formatDate(preview.dueDate)}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12, fontSize: 11 }}>
                    <div
                      style={{
                        color: "#8892a4",
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 3,
                      }}
                    >
                      Bill To
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {preview.customer?.name}
                    </div>
                    <div style={{ color: "#8892a4" }}>
                      {preview.customer?.mobile}
                    </div>
                    {preview.customer?.gstNo && (
                      <div style={{ color: "#8892a4" }}>
                        GST: {preview.customer.gstNo}
                      </div>
                    )}
                  </div>
                  <table style={{ fontSize: 11, marginBottom: 10 }}>
                    <thead>
                      <tr>
                        <th style={{ width: "50%" }}>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                          <td>{item.description}</td>
                          <td>{item.qty}</td>
                          <td>{formatCurrency(item.rate)}</td>
                          <td>{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 3,
                    }}
                  >
                    <div style={{ display: "flex", gap: 40, fontSize: 12 }}>
                      <span style={{ color: "#8892a4" }}>Subtotal</span>
                      <span>{formatCurrency(preview.subTotal)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 40, fontSize: 12 }}>
                      <span style={{ color: "#8892a4" }}>GST</span>
                      <span>{formatCurrency(preview.gstAmount)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 40,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#10b981",
                        borderTop: "1px solid #2a3348",
                        paddingTop: 6,
                        width: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      <span>Total</span>
                      <span>{formatCurrency(preview.totalAmount)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 40, fontSize: 12 }}>
                      <span style={{ color: "#8892a4" }}>Paid</span>
                      <span style={{ color: "#3b82f6" }}>
                        {formatCurrency(preview.paidAmount)}
                      </span>
                    </div>
                    {preview.totalAmount - preview.paidAmount > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 40,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#ef4444",
                        }}
                      >
                        <span>Balance Due</span>
                        <span>
                          {formatCurrency(
                            preview.totalAmount - preview.paidAmount,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {preview.notes && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 10px",
                        background: "#1e2535",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "#8892a4",
                      }}
                    >
                      Note: {preview.notes}
                    </div>
                  )}
                  <Badge color={INV_COLOR[preview.status]}>
                    {preview.status}
                  </Badge>
                </div>
              )}
            </CardBody>
          </Card>
        </Grid>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Invoice"
        width={580}
        footer={
          <>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Invoice"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Customer *">
              <Select
                value={form.customerId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customerId: e.target.value }))
                }
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="Due Date *">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dueDate: e.target.value }))
                }
                required
              />
            </FormGroup>
          </Grid>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#8892a4",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Line Items *
              </label>
              <Button size="sm" type="button" onClick={addItem}>
                + Add Item
              </Button>
            </div>
            {form.items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#1e2535",
                  border: "1px solid #2a3348",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <Input
                  style={{ marginBottom: 8 }}
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Item description"
                  required
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr auto",
                    gap: 8,
                  }}
                >
                  <Input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    placeholder="Qty"
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(i, "rate", e.target.value)}
                    placeholder="Rate ₹"
                    required
                  />
                  <Select
                    value={item.gstPct}
                    onChange={(e) => updateItem(i, "gstPct", e.target.value)}
                  >
                    <option value="0">No GST</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </Select>
                  {form.items.length > 1 && (
                    <Button
                      size="sm"
                      type="button"
                      variant="danger"
                      onClick={() => removeItem(i)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <FormGroup label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              rows={2}
            />
          </FormGroup>
          <div
            style={{
              background: "#1e2535",
              borderRadius: 8,
              padding: 12,
              border: "1px solid #2a3348",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 3,
              }}
            >
              <span style={{ color: "#8892a4" }}>Subtotal</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#8892a4" }}>GST</span>
              <span>{formatCurrency(gstTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                fontWeight: 700,
                color: "#10b981",
                borderTop: "1px solid #2a3348",
                paddingTop: 6,
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(subTotal + gstTotal)}</span>
            </div>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
