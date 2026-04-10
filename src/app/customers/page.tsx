"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card, CardHeader, CardTitle, CardBody, Badge, Button, Modal,
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

  useEffect(() => { fetchCustomers() }, []);

  async function fetchCustomers() {
    setLoading(true);
    const res = await fetch("/api/customers" + (search ? `?search=${search}` : ""));
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  // ── CREATE ──────────────────────────────────────────────────
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
    } catch {
      toast.error("Failed to add customer");
    }
    setSaving(false);
  }

  // ── UPDATE ──────────────────────────────────────────────────
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
      setCustomers((p) => p.map((c) => (c.id === updated.id ? updated : c)));
      setEditCustomer(null);
      toast.success(`${updated.name} updated!`);
    } catch {
      toast.error("Failed to update customer");
    }
    setSaving(false);
  }

  // ── DELETE ──────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteCustomer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCustomers((p) => p.filter((c) => c.id !== deleteCustomer.id));
      setDeleteCustomer(null);
      toast.success("Customer deleted");
    } catch {
      toast.error("Failed to delete. Customer may have existing orders.");
    }
    setDeleting(false);
  }

  // ── TOGGLE ACTIVE ────────────────────────────────────────────
  async function toggleActive(customer: any) {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !customer.active }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCustomers((p) => p.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(updated.active ? "Customer activated" : "Customer deactivated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  const filtered = customers.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
  );

  const FormFields = ({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) => (
    <>
      <Grid cols={2} gap={12}>
        <FormGroup label="Name *">
          <Input value={data.name} onChange={(e) => onChange("name", e.target.value)} required />
        </FormGroup>
        <FormGroup label="Mobile *">
          <Input value={data.mobile} onChange={(e) => onChange("mobile", e.target.value)} required />
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
                        <div style={{ display: "flex", gap: 5 }}>
                          {/* View */}
                          <button onClick={() => setViewCustomer(c)}
                            title="View Details"
                            style={{ padding: "4px 8px", background: "rgba(59,130,246,.12)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 6, color: "#3b82f6", fontSize: 12, cursor: "pointer" }}>
                            👁 View
                          </button>
                          {/* Edit */}
                          <button onClick={() => setEditCustomer({ ...c })}
                            title="Edit"
                            style={{ padding: "4px 8px", background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 6, color: "#10b981", fontSize: 12, cursor: "pointer" }}>
                            ✏ Edit
                          </button>
                          {/* Delete */}
                          <button onClick={() => setDeleteCustomer(c)}
                            title="Delete"
                            style={{ padding: "4px 8px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6, color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
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

      {/* ── ADD CUSTOMER MODAL ── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm) }} title="Add New Customer"
        footer={<>
          <Button onClick={() => { setShowModal(false); setForm(emptyForm) }}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "💾 Save Customer"}</Button>
        </>}>
        <form onSubmit={handleCreate}>
          <FormFields data={form} onChange={f} />
        </form>
      </Modal>

      {/* ── VIEW CUSTOMER MODAL ── */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title={`Customer — ${viewCustomer?.name}`}
        footer={<>
          <Button onClick={() => { setEditCustomer({ ...viewCustomer }); setViewCustomer(null) }}>✏ Edit</Button>
          <Button onClick={() => setViewCustomer(null)}>Close</Button>
        </>}>
        {viewCustomer && (
          <div>
            {/* Profile header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "14px 16px", background: "#1e2535", borderRadius: 10, border: "1px solid #2a3348" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {viewCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{viewCustomer.name}</div>
                <div style={{ fontSize: 12, color: "#8892a4" }}>{viewCustomer.mobile}</div>
                <div style={{ marginTop: 4 }}><Badge color={viewCustomer.active ? "green" : "red"}>{viewCustomer.active ? "Active" : "Inactive"}</Badge></div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <Button size="sm" onClick={() => toggleActive(viewCustomer)}>
                  {viewCustomer.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                ["Customer Code", viewCustomer.code],
                ["Mobile", viewCustomer.mobile],
                ["Email", viewCustomer.email || "—"],
                ["City", viewCustomer.city || "—"],
                ["GST Number", viewCustomer.gstNo || "—"],
                ["Credit Limit", viewCustomer.creditLimit ? formatCurrency(viewCustomer.creditLimit) : "—"],
                ["Address", viewCustomer.address || "—"],
                ["Member Since", formatDate(viewCustomer.createdAt)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "10px 12px", background: "#1e2535", borderRadius: 8, border: "1px solid #2a3348" }}>
                  <div style={{ fontSize: 9, color: "#8892a4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button style={{ flex: 1, justifyContent: "center" }}
                onClick={() => window.open(`tel:${viewCustomer.mobile}`)}>
                📞 Call
              </Button>
              {viewCustomer.email && (
                <Button style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => window.open(`mailto:${viewCustomer.email}`)}>
                  📧 Email
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── EDIT CUSTOMER MODAL ── */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title={`Edit — ${editCustomer?.name}`}
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
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, fontSize: 11, color: "#10b981" }}>
              ✅ Code <b>{editCustomer.code}</b> cannot be changed — it is auto-assigned.
            </div>
          </form>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal open={!!deleteCustomer} onClose={() => setDeleteCustomer(null)} title="Delete Customer"
        footer={<>
          <Button onClick={() => setDeleteCustomer(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "🗑 Yes, Delete"}</Button>
        </>}>
        {deleteCustomer && (
          <div>
            <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                Delete <span style={{ color: "#ef4444" }}>{deleteCustomer.name}</span>?
              </div>
              <div style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.6 }}>
                This will permanently delete this customer.<br />
                <b style={{ color: "#f59e0b" }}>Note:</b> If this customer has existing orders or invoices, deletion will fail.
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "#1e2535", borderRadius: 8, border: "1px solid #2a3348", fontSize: 12 }}>
              <div style={{ marginBottom: 4 }}><span style={{ color: "#8892a4" }}>Name: </span><b>{deleteCustomer.name}</b></div>
              <div style={{ marginBottom: 4 }}><span style={{ color: "#8892a4" }}>Mobile: </span>{deleteCustomer.mobile}</div>
              <div><span style={{ color: "#8892a4" }}>Code: </span>{deleteCustomer.code}</div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}