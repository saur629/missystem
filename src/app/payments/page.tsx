"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card, CardHeader, CardTitle, Badge, Button, Modal,
  FormGroup, Input, StatCard, Loading, Empty, Grid,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const emptyForm = { name: "", mobile: "", email: "", address: "", city: "", gstNo: "", creditLimit: "" };
  const [form, setForm] = useState(emptyForm);
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    setLoading(true);
    const res = await fetch("/api/customers" + (search ? `?search=${search}` : ""));
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  // ── CREATE ────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const c = await res.json();
      setCustomers((p) => [...p, c]);
      setShowModal(false);
      setForm(emptyForm);
      toast.success(`Customer ${c.name} added!`);
    } catch { toast.error("Failed to add customer"); }
    setSaving(false);
  }

  // ── UPDATE ────────────────────────────────────────────────
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCustomer),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCustomers((p) => p.map((c) => c.id === updated.id ? updated : c));
      setEditCustomer(null);
      toast.success(`${updated.name} updated!`);
    } catch { toast.error("Failed to update"); }
    setSaving(false);
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteCustomer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCustomers((p) => p.filter((c) => c.id !== deleteCustomer.id));
      setDeleteCustomer(null);
      toast.success("Customer deleted");
    } catch { toast.error("Cannot delete — customer has existing orders or invoices"); }
    setDeleting(false);
  }

  // ── TOGGLE ACTIVE ─────────────────────────────────────────
  async function toggleActive(customer: any) {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !customer.active }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCustomers((p) => p.map((c) => c.id === updated.id ? updated : c));
      if (viewCustomer?.id === updated.id) setViewCustomer(updated);
      toast.success(updated.active ? "Customer activated" : "Customer deactivated");
    } catch { toast.error("Failed to update status"); }
  }

  // ── PRINT A4 CUSTOMER CARD ────────────────────────────────
  function printCustomerCard(customer: any) {
    const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "PrintFlow MIS";
    const now = new Date();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Customer Card — ${customer.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: white; }
    @page { size: A4; margin: 14mm; }

    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a56db; padding-bottom:12px; margin-bottom:18px; }
    .shop { font-size:20px; font-weight:700; color:#1a56db; }
    .shop-sub { font-size:11px; color:#555; margin-top:2px; }
    .meta { text-align:right; font-size:10px; color:#555; }

    .profile { display:flex; align-items:center; gap:20px; background:#eff6ff; border:2px solid #bfdbfe; border-radius:10px; padding:16px 20px; margin-bottom:20px; }
    .avatar { width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg,#1a56db,#7c3aed); display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; color:#fff; flex-shrink:0; }
    .cust-name { font-size:20px; font-weight:700; color:#1a56db; }
    .cust-code { font-size:11px; color:#555; margin-top:2px; font-family:monospace; }
    .status-pill { display:inline-block; padding:3px 12px; border-radius:20px; font-size:10px; font-weight:700; margin-top:6px; }
    .active   { background:#dcfce7; color:#16a34a; }
    .inactive { background:#fee2e2; color:#dc2626; }

    .section { margin-bottom:18px; }
    .section-title { font-size:11px; font-weight:700; color:#1a56db; background:#eff6ff; border-left:4px solid #1a56db; padding:5px 10px; border-radius:0 4px 4px 0; margin-bottom:10px; }

    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .info-box { border:1px solid #e2e8f0; border-radius:6px; padding:9px 12px; }
    .info-label { font-size:9px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
    .info-value { font-size:13px; font-weight:600; color:#000; }
    .info-value.highlight { color:#1a56db; }
    .info-value.money { color:#059669; }

    .table-wrap { margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { background:#1a56db; color:white; padding:7px 9px; text-align:left; font-size:10px; }
    td { padding:7px 9px; border-bottom:1px solid #e5e7eb; }
    tr:nth-child(even) td { background:#f8fafc; }
    .amount { font-weight:700; color:#059669; }
    .balance { font-weight:700; color:#dc2626; }

    .notes-box { border:1px solid #e2e8f0; border-radius:6px; padding:12px; min-height:60px; font-size:11px; color:#333; }

    .sig-row { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:24px; }
    .sig-line { height:35px; border-bottom:1px solid #000; margin-bottom:5px; }
    .sig-label { font-size:10px; color:#555; text-align:center; }

    .footer { margin-top:16px; text-align:center; font-size:9px; color:#aaa; border-top:1px solid #eee; padding-top:8px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="shop">🖨️ ${shopName}</div>
      <div class="shop-sub">Customer Information Card</div>
    </div>
    <div class="meta">
      <div>Date: <strong>${now.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</strong></div>
      <div>Time: <strong>${now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</strong></div>
    </div>
  </div>

  <!-- PROFILE -->
  <div class="profile">
    <div class="avatar">${customer.name.charAt(0).toUpperCase()}</div>
    <div>
      <div class="cust-name">${customer.name}</div>
      <div class="cust-code">Code: ${customer.code}</div>
      <div>
        <span class="status-pill ${customer.active ? "active" : "inactive"}">
          ${customer.active ? "✓ Active Customer" : "✗ Inactive"}
        </span>
      </div>
    </div>
    <div style="margin-left:auto; text-align:right;">
      <div style="font-size:10px; color:#555; margin-bottom:4px;">Member Since</div>
      <div style="font-size:14px; font-weight:700; color:#1a56db;">${formatDate(customer.createdAt)}</div>
    </div>
  </div>

  <!-- CONTACT DETAILS -->
  <div class="section">
    <div class="section-title">📞 Contact Details</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Mobile Number</div>
        <div class="info-value highlight">${customer.mobile}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Email Address</div>
        <div class="info-value">${customer.email || "—"}</div>
      </div>
      <div class="info-box">
        <div class="info-label">City</div>
        <div class="info-value">${customer.city || "—"}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Address</div>
        <div class="info-value">${customer.address || "—"}</div>
      </div>
    </div>
  </div>

  <!-- BUSINESS DETAILS -->
  <div class="section">
    <div class="section-title">💼 Business Details</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">GST Number</div>
        <div class="info-value">${customer.gstNo || "Not Registered"}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Credit Limit</div>
        <div class="info-value money">${customer.creditLimit ? "₹" + Number(customer.creditLimit).toLocaleString("en-IN") : "No Limit Set"}</div>
      </div>
    </div>
  </div>

  <!-- NOTES -->
  <div class="section">
    <div class="section-title">📝 Notes / Remarks</div>
    <div class="notes-box">&nbsp;</div>
  </div>

  <!-- SIGNATURE -->
  <div class="sig-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorised By</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature</div>
    </div>
  </div>

  <div class="footer">
    Generated by ${shopName} • ${now.toLocaleString("en-IN")} • Customer Code: ${customer.code}
  </div>

</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { toast.error("Please allow popups to print"); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); win.close(); };
  }

  const filtered = customers.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
  );

  // Shared form fields component
  const FormFields = ({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) => (
    <>
      <Grid cols={2} gap={12}>
        <FormGroup label="Name *">
          <Input value={data.name || ""} onChange={(e) => onChange("name", e.target.value)} required />
        </FormGroup>
        <FormGroup label="Mobile *">
          <Input value={data.mobile || ""} onChange={(e) => onChange("mobile", e.target.value)} required />
        </FormGroup>
        <FormGroup label="Email">
          <Input type="email" value={data.email || ""} onChange={(e) => onChange("email", e.target.value)} />
        </FormGroup>
        <FormGroup label="City">
          <Input value={data.city || ""} onChange={(e) => onChange("city", e.target.value)} />
        </FormGroup>
        <FormGroup label="GST No.">
          <Input value={data.gstNo || ""} onChange={(e) => onChange("gstNo", e.target.value)} placeholder="09XXXXX1234Z1ZX" />
        </FormGroup>
        <FormGroup label="Credit Limit (₹)">
          <Input type="number" value={data.creditLimit || ""} onChange={(e) => onChange("creditLimit", e.target.value)} />
        </FormGroup>
      </Grid>
      <FormGroup label="Address">
        <Input value={data.address || ""} onChange={(e) => onChange("address", e.target.value)} />
      </FormGroup>
    </>
  );

  return (
    <PageShell title="Customers" action={{ label: "+ Add Customer", onClick: () => setShowModal(true) }}>
      <div className="animate-in">

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Customers" value={customers.length} icon="👥" color="blue" />
          <StatCard label="Active" value={customers.filter((c) => c.active).length} icon="✅" color="green" />
          <StatCard label="With GST" value={customers.filter((c) => c.gstNo).length} icon="🧾" color="yellow" />
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Input placeholder="🔍 Search by name or mobile..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
            style={{ flex: 1 }} />
          <Button onClick={fetchCustomers}>Search</Button>
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Add Customer</Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>Customer Directory ({filtered.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : filtered.length === 0 ? <Empty message="No customers found" /> : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Mobile</th><th>City</th>
                    <th>GST No.</th><th>Credit Limit</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "#3b82f6" }}>{c.code}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: "#8892a4" }}>{c.mobile}</td>
                      <td style={{ color: "#8892a4" }}>{c.city || "—"}</td>
                      <td style={{ fontSize: 11, color: "#8892a4" }}>{c.gstNo || "—"}</td>
                      <td style={{ color: "#10b981" }}>{c.creditLimit ? formatCurrency(c.creditLimit) : "—"}</td>
                      <td><Badge color={c.active ? "green" : "red"}>{c.active ? "Active" : "Inactive"}</Badge></td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setViewCustomer(c)} title="View"
                            style={{ padding: "4px 9px", background: "rgba(59,130,246,.12)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 6, color: "#3b82f6", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            👁 View
                          </button>
                          <button onClick={() => setEditCustomer({ ...c })} title="Edit"
                            style={{ padding: "4px 9px", background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 6, color: "#10b981", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            ✏ Edit
                          </button>
                          <button onClick={() => setDeleteCustomer(c)} title="Delete"
                            style={{ padding: "4px 9px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6, color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── ADD MODAL ── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm); }} title="Add New Customer"
        footer={<>
          <Button onClick={() => { setShowModal(false); setForm(emptyForm); }}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "💾 Save Customer"}</Button>
        </>}>
        <form onSubmit={handleCreate}>
          <FormFields data={form} onChange={f} />
        </form>
      </Modal>

      {/* ── VIEW MODAL ── */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)}
        title={`Customer — ${viewCustomer?.name}`}
        footer={<>
          <Button onClick={() => printCustomerCard(viewCustomer)}>🖨️ Print A4</Button>
          <Button onClick={() => { setEditCustomer({ ...viewCustomer }); setViewCustomer(null); }}>✏ Edit</Button>
          <Button onClick={() => setViewCustomer(null)}>Close</Button>
        </>}>
        {viewCustomer && (
          <div>
            {/* Profile header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "#1e2535", borderRadius: 10, border: "1px solid #2a3348", marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {viewCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{viewCustomer.name}</div>
                <div style={{ fontSize: 11, color: "#8892a4", fontFamily: "monospace" }}>{viewCustomer.code}</div>
                <div style={{ marginTop: 4 }}>
                  <Badge color={viewCustomer.active ? "green" : "red"}>{viewCustomer.active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
              <Button size="sm" onClick={() => toggleActive(viewCustomer)}>
                {viewCustomer.active ? "Deactivate" : "Activate"}
              </Button>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                ["📱 Mobile",        viewCustomer.mobile,                              "#3b82f6"],
                ["📧 Email",         viewCustomer.email || "—",                        "#e2e8f0"],
                ["🏙 City",          viewCustomer.city || "—",                         "#e2e8f0"],
                ["📍 Address",       viewCustomer.address || "—",                      "#e2e8f0"],
                ["🧾 GST No.",       viewCustomer.gstNo || "Not Registered",           "#e2e8f0"],
                ["💳 Credit Limit",  viewCustomer.creditLimit ? formatCurrency(viewCustomer.creditLimit) : "—", "#10b981"],
                ["📅 Member Since",  formatDate(viewCustomer.createdAt),               "#e2e8f0"],
                ["🔢 Code",          viewCustomer.code,                                "#3b82f6"],
              ].map(([label, value, color]) => (
                <div key={label as string} style={{ padding: "10px 12px", background: "#1e2535", borderRadius: 8, border: "1px solid #2a3348" }}>
                  <div style={{ fontSize: 9, color: "#8892a4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label as string}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: color as string }}>{value as string}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => window.open(`tel:${viewCustomer.mobile}`)}
                style={{ flex: 1, padding: "8px", background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 8, color: "#3b82f6", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                📞 Call
              </button>
              {viewCustomer.email && (
                <button onClick={() => window.open(`mailto:${viewCustomer.email}`)}
                  style={{ flex: 1, padding: "8px", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, color: "#10b981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  📧 Email
                </button>
              )}
              <button onClick={() => printCustomerCard(viewCustomer)}
                style={{ flex: 1, padding: "8px", background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.3)", borderRadius: 8, color: "#8b5cf6", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                🖨️ Print A4
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)}
        title={`Edit — ${editCustomer?.name}`}
        footer={<>
          <Button onClick={() => setEditCustomer(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</Button>
        </>}>
        {editCustomer && (
          <form onSubmit={handleUpdate}>
            <FormFields
              data={editCustomer}
              onChange={(k, v) => setEditCustomer((p: any) => ({ ...p, [k]: v }))}
            />
            <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, fontSize: 11, color: "#10b981" }}>
              ✅ Code <b>{editCustomer.code}</b> is auto-assigned and cannot be changed.
            </div>
          </form>
        )}
      </Modal>

      {/* ── DELETE MODAL ── */}
      <Modal open={!!deleteCustomer} onClose={() => setDeleteCustomer(null)} title="Delete Customer"
        footer={<>
          <Button onClick={() => setDeleteCustomer(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "🗑 Yes, Delete"}</Button>
        </>}>
        {deleteCustomer && (
          <div>
            <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                Delete <span style={{ color: "#ef4444" }}>{deleteCustomer.name}</span>?
              </div>
              <div style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.7 }}>
                This will permanently delete this customer.<br />
                <b style={{ color: "#f59e0b" }}>⚠ Note:</b> Deletion will fail if this customer has existing orders or invoices.
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "#1e2535", borderRadius: 8, border: "1px solid #2a3348" }}>
              {[["Name", deleteCustomer.name], ["Mobile", deleteCustomer.mobile], ["Code", deleteCustomer.code]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#8892a4" }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}