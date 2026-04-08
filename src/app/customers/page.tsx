"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Modal,
  FormGroup,
  Input,
  StatCard,
  Loading,
  Empty,
  Grid,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    gstNo: "",
    creditLimit: "",
  });
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const res = await fetch(
      "/api/customers" + (search ? `?search=${search}` : ""),
    );
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

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
      setForm({
        name: "",
        mobile: "",
        email: "",
        address: "",
        city: "",
        gstNo: "",
        creditLimit: "",
      });
      toast.success(`Customer ${c.name} added!`);
    } catch {
      toast.error("Failed to add customer");
    }
    setSaving(false);
  }

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search),
  );

  return (
    <PageShell
      title="Customers"
      action={{ label: "+ Add Customer", onClick: () => setShowModal(true) }}
    >
      <div className="animate-in">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Total Customers"
            value={customers.length}
            icon="👥"
            color="blue"
          />
          <StatCard
            label="Active"
            value={customers.filter((c) => c.active).length}
            icon="✅"
            color="green"
          />
          <StatCard
            label="With GST"
            value={customers.filter((c) => c.gstNo).length}
            icon="🧾"
            color="yellow"
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Input
            placeholder="🔍 Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
            style={{ flex: 1 }}
          />
          <Button onClick={fetchCustomers}>Search</Button>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Add Customer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Directory ({filtered.length})</CardTitle>
          </CardHeader>
          {loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <Empty message="No customers found" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>GST No.</th>
                    <th>Credit Limit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "#3b82f6",
                        }}
                      >
                        {c.code}
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: "#8892a4" }}>{c.mobile}</td>
                      <td style={{ color: "#8892a4", fontSize: 11 }}>
                        {c.email || "—"}
                      </td>
                      <td style={{ color: "#8892a4" }}>{c.city || "—"}</td>
                      <td style={{ fontSize: 11, color: "#8892a4" }}>
                        {c.gstNo || "—"}
                      </td>
                      <td style={{ color: "#10b981" }}>
                        {c.creditLimit ? formatCurrency(c.creditLimit) : "—"}
                      </td>
                      <td>
                        <Badge color={c.active ? "green" : "red"}>
                          {c.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Customer"
        footer={
          <>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Customer"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Name *">
              <Input
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup label="Mobile *">
              <Input
                value={form.mobile}
                onChange={(e) => f("mobile", e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => f("email", e.target.value)}
              />
            </FormGroup>
            <FormGroup label="City">
              <Input
                value={form.city}
                onChange={(e) => f("city", e.target.value)}
              />
            </FormGroup>
            <FormGroup label="GST No.">
              <Input
                value={form.gstNo}
                onChange={(e) => f("gstNo", e.target.value)}
                placeholder="09XXXXX1234Z1ZX"
              />
            </FormGroup>
            <FormGroup label="Credit Limit (₹)">
              <Input
                type="number"
                value={form.creditLimit}
                onChange={(e) => f("creditLimit", e.target.value)}
              />
            </FormGroup>
          </Grid>
          <FormGroup label="Address">
            <Input
              value={form.address}
              onChange={(e) => f("address", e.target.value)}
            />
          </FormGroup>
        </form>
      </Modal>
    </PageShell>
  );
}
