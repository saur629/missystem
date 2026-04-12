"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
} from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS,
  PRIORITY_COLOR,
} from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";

const TYPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports?type=summary").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([sum, ords]) => {
        setSummary(sum);
        setOrders(Array.isArray(ords) ? ords : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Status counts from real orders
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const inProgress = orders.filter((o) =>
    [
      "DESIGNING",
      "DESIGN_DONE",
      "PRINTING",
      "PRINT_DONE",
      "QUALITY_CHECK",
    ].includes(o.status),
  ).length;
  const ready = orders.filter((o) => o.status === "READY").length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  // Order type pie
  const orderTypes = orders.reduce(
    (acc, o) => {
      acc[o.orderType] = (acc[o.orderType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const pieData = Object.entries(orderTypes).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly revenue from real API data
  const monthlyChart = MONTHS.map((m) => ({
    m,
    rev: summary?.monthlyRevenue?.[m] || 0,
  }));

  // Recent orders — latest 8
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  // Overdue orders
  const overdue = orders.filter(
    (o) =>
      o.dueDate &&
      new Date(o.dueDate) < new Date() &&
      !["DELIVERED", "CANCELLED"].includes(o.status),
  );

  const TT = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <div
        style={{
          background: "#1e2535",
          border: "1px solid #2a3348",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11,
        }}
      >
        <div style={{ color: "#8892a4" }}>{label}</div>
        <div style={{ color: "#3b82f6", fontWeight: 600 }}>
          {formatCurrency(payload[0].value)}
        </div>
      </div>
    ) : null;

  return (
    <PageShell title="Dashboard">
      <div className="animate-in">
        {/* ── ROW 1: Key Stats ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            label="Total Billed"
            value={formatCurrency(summary?.totalBilled || 0)}
            icon="💰"
            color="blue"
          />
          <StatCard
            label="Collected"
            value={formatCurrency(summary?.totalCollected || 0)}
            icon="✅"
            color="green"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(summary?.totalOutstanding || 0)}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            label="Today's Revenue"
            value={formatCurrency(summary?.todayRevenue || 0)}
            icon="📅"
            color="blue"
          />
          <StatCard
            label="Customers"
            value={summary?.customers || 0}
            icon="👥"
            color="purple"
          />
        </div>

        {/* ── ROW 2: Order Status Stats ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            label="Total Orders"
            value={orders.length}
            icon="📋"
            color="blue"
          />
          <StatCard label="Pending" value={pending} icon="🔴" color="red" />
          <StatCard
            label="In Progress"
            value={inProgress}
            icon="⚙️"
            color="yellow"
          />
          <StatCard
            label="Ready to Pickup"
            value={ready}
            icon="📦"
            color="green"
          />
          <StatCard
            label="Delivered"
            value={delivered}
            icon="✅"
            color="green"
            sub={overdue.length > 0 ? `⚠ ${overdue.length} overdue` : undefined}
          />
        </div>

        {/* ── ROW 3: Today + Month ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            label="Today's Orders"
            value={summary?.todayOrderCount || 0}
            icon="📋"
            color="blue"
          />
          <StatCard
            label="Today Collected"
            value={formatCurrency(summary?.todayCollected || 0)}
            icon="💳"
            color="green"
          />
          <StatCard
            label="Month Orders"
            value={summary?.monthOrderCount || 0}
            icon="📊"
            color="blue"
          />
          <StatCard
            label="Month Revenue"
            value={formatCurrency(summary?.monthRevenue || 0)}
            icon="📈"
            color="green"
          />
        </div>

        {/* ── ROW 4: Charts ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue (from Orders)</CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div
                  style={{
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8892a4",
                    fontSize: 12,
                  }}
                >
                  Loading chart...
                </div>
              ) : monthlyChart.every((m) => m.rev === 0) ? (
                <div
                  style={{
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8892a4",
                    fontSize: 12,
                  }}
                >
                  No revenue data yet — create some orders!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={monthlyChart} barSize={16}>
                    <XAxis
                      dataKey="m"
                      tick={{ fill: "#8892a4", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={<TT />}
                      cursor={{ fill: "rgba(255,255,255,.03)" }}
                    />
                    <Bar dataKey="rev" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Types</CardTitle>
            </CardHeader>
            <CardBody>
              {pieData.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PieChart width={90} height={90}>
                    <Pie
                      data={pieData}
                      cx={40}
                      cy={40}
                      innerRadius={24}
                      outerRadius={42}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={TYPE_COLORS[i % TYPE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                  <div>
                    {pieData.map((item, i) => (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: TYPE_COLORS[i % TYPE_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "#8892a4" }}>{item.name}</span>
                        <span
                          style={{
                            color: "#e2e8f0",
                            fontWeight: 600,
                            marginLeft: "auto",
                            paddingLeft: 8,
                          }}
                        >
                          {String(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: "#8892a4",
                    fontSize: 12,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  No orders yet
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── ROW 5: Status Quick Links ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            {
              label: "Pending",
              status: "PENDING",
              icon: "🔴",
              color: "#ef4444",
            },
            {
              label: "Designing",
              status: "DESIGNING",
              icon: "🎨",
              color: "#8b5cf6",
            },
            {
              label: "Printing",
              status: "PRINTING",
              icon: "🖨️",
              color: "#f59e0b",
            },
            { label: "Ready", status: "READY", icon: "📦", color: "#10b981" },
          ].map((s) => {
            const count = orders.filter((o) => o.status === s.status).length;
            return (
              <Link
                key={s.status}
                href={`/orders?status=${s.status}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#161b27",
                    border: `1px solid ${s.color}30`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                  <div
                    style={{ fontSize: 22, fontWeight: 700, color: s.color }}
                  >
                    {count}
                  </div>
                  <div style={{ fontSize: 11, color: "#8892a4" }}>
                    {s.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── ROW 6: Overdue Alert ── */}
        {overdue.length > 0 && (
          <div
            style={{
              background: "rgba(239,68,68,.08)",
              border: "1px solid rgba(239,68,68,.25)",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#ef4444",
                marginBottom: 8,
              }}
            >
              ⚠️ {overdue.length} Overdue Order{overdue.length > 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {overdue.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: "rgba(239,68,68,.1)",
                    border: "1px solid rgba(239,68,68,.2)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color: "#ef4444",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {o.orderNo}
                  </span>
                  <span style={{ color: "#8892a4", marginLeft: 6 }}>
                    {o.customer?.name}
                  </span>
                  <span style={{ color: "#ef4444", marginLeft: 6 }}>
                    Due: {formatDate(o.dueDate)}
                  </span>
                </div>
              ))}
              {overdue.length > 5 && (
                <span
                  style={{ fontSize: 11, color: "#8892a4", padding: "4px 0" }}
                >
                  +{overdue.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── ROW 7: Recent Orders ── */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({orders.length} total)</CardTitle>
            <Link
              href="/orders"
              style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}
            >
              View All →
            </Link>
          </CardHeader>
          {loading ? (
            <div
              style={{
                padding: 20,
                color: "#8892a4",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Loading...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          color: "#8892a4",
                          padding: 30,
                        }}
                      >
                        No orders yet —{" "}
                        <Link href="/orders" style={{ color: "#3b82f6" }}>
                          create your first order!
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => {
                      const st = ORDER_STATUS[o.status];
                      const isOverdue =
                        o.dueDate &&
                        new Date(o.dueDate) < new Date() &&
                        !["DELIVERED", "CANCELLED"].includes(o.status);
                      return (
                        <tr
                          key={o.id}
                          style={{
                            background: isOverdue
                              ? "rgba(239,68,68,.04)"
                              : undefined,
                          }}
                        >
                          <td
                            style={{
                              color: "#3b82f6",
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {o.orderNo}
                          </td>
                          <td style={{ color: "#8892a4", fontSize: 11 }}>
                            {formatDate(o.createdAt)}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {o.customer?.name}
                          </td>
                          <td style={{ color: "#8892a4", fontSize: 11 }}>
                            {o.customer?.mobile}
                          </td>
                          <td>
                            <Badge color="blue">{o.orderType}</Badge>
                          </td>
                          <td style={{ color: "#10b981", fontWeight: 600 }}>
                            {formatCurrency(o.totalAmount)}
                          </td>
                          <td
                            style={{
                              color: o.balanceDue > 0 ? "#ef4444" : "#10b981",
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(o.balanceDue)}
                          </td>
                          <td>
                            <Badge color={PRIORITY_COLOR[o.priority]}>
                              {o.priority}
                            </Badge>
                          </td>
                          <td>
                            <Badge color={(st as any)?.color}>
                              {(st as any)?.icon} {(st as any)?.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
