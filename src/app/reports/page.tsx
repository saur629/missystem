"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  StatCard,
  Badge,
  Loading,
} from "@/components/ui";
import { formatCurrency, ORDER_STATUS } from "@/lib/utils";
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
  LineChart,
  Line,
} from "recharts";

const TABS = ["Overview", "Orders", "Customers", "Monthly P&L"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
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
      <div style={{ color: "#8892a4", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  ) : null;

export default function ReportsPage() {
  const [tab, setTab] = useState("Overview");
  const [summary, setSummary] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports?type=summary").then((r) => r.json()),
      fetch("/api/reports?type=customers").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([sum, cls, ords]) => {
        setSummary(sum);
        setCustomers(Array.isArray(cls) ? cls : []);
        setOrders(Array.isArray(ords) ? ords : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Build real monthly revenue from orders ──────────────────
  const monthlyMap = MONTHS.map((m) => {
    const rev = summary?.monthlyRevenue?.[m] || 0;
    // Estimate cost as advance paid (real data) — or 0 if none
    return { m, rev, collected: 0 };
  });

  // Build monthly from actual orders
  const ordersByMonth = MONTHS.map((month) => {
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.toLocaleDateString("en-IN", { month: "short" }) === month;
    });
    const rev = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const collected = monthOrders.reduce((s, o) => s + (o.advancePaid || 0), 0);
    const balance = monthOrders.reduce((s, o) => s + (o.balanceDue || 0), 0);
    return { m: month, rev, collected, balance, count: monthOrders.length };
  });

  // ── Summary numbers from real data ─────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalCollected = orders.reduce((s, o) => s + (o.advancePaid || 0), 0);
  const totalBalance = orders.reduce((s, o) => s + (o.balanceDue || 0), 0);
  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const deliveryRate = totalOrders
    ? Math.round((deliveredCount / totalOrders) * 100)
    : 0;

  // Avg order value
  const avgOrderValue = totalOrders
    ? Math.round(totalRevenue / totalOrders)
    : 0;

  // Top revenue month
  const topMonth = ordersByMonth.reduce(
    (best, m) => (m.rev > best.rev ? m : best),
    ordersByMonth[0],
  );

  // Order types pie
  const ordersByType = orders.reduce(
    (acc, o) => {
      acc[o.orderType] = (acc[o.orderType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const pieData = Object.entries(ordersByType).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  // Revenue by type
  const revenueByType = orders.reduce(
    (acc, o) => {
      acc[o.orderType] = (acc[o.orderType] || 0) + (o.totalAmount || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  // Priority breakdown
  const byPriority = {
    NORMAL: orders.filter((o) => o.priority === "NORMAL").length,
    URGENT: orders.filter((o) => o.priority === "URGENT").length,
    EXPRESS: orders.filter((o) => o.priority === "EXPRESS").length,
  };

  // Overdue orders
  const overdueOrders = orders.filter(
    (o) =>
      o.dueDate &&
      new Date(o.dueDate) < new Date() &&
      !["DELIVERED", "CANCELLED"].includes(o.status),
  );

  // Non-zero months for chart
  const chartData = ordersByMonth.filter((m) => m.rev > 0 || m.collected > 0);

  return (
    <PageShell title="Reports & Analytics">
      <div className="animate-in">
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            background: "#1e2535",
            borderRadius: 8,
            marginBottom: 20,
            width: "fit-content",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                background: tab === t ? "#161b27" : "transparent",
                color: tab === t ? "#e2e8f0" : "#8892a4",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === "Overview" && (
              <div>
                {/* KPI Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <StatCard
                    label="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon="💰"
                    color="blue"
                    sub={`${totalOrders} orders`}
                  />
                  <StatCard
                    label="Total Collected"
                    value={formatCurrency(totalCollected)}
                    icon="✅"
                    color="green"
                    sub="Advance received"
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(totalBalance)}
                    icon="⏳"
                    color="yellow"
                    sub="Balance pending"
                  />
                  <StatCard
                    label="Avg Order Value"
                    value={formatCurrency(avgOrderValue)}
                    icon="📊"
                    color="purple"
                    sub={`${deliveryRate}% delivery rate`}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <StatCard
                    label="Total Orders"
                    value={totalOrders}
                    icon="📋"
                    color="blue"
                  />
                  <StatCard
                    label="Delivered"
                    value={deliveredCount}
                    icon="✅"
                    color="green"
                  />
                  <StatCard
                    label="Overdue"
                    value={overdueOrders.length}
                    icon="⚠️"
                    color="red"
                  />
                  <StatCard
                    label="Top Month"
                    value={topMonth?.m || "—"}
                    icon="🏆"
                    color="yellow"
                    sub={
                      topMonth?.rev ? formatCurrency(topMonth.rev) : "No data"
                    }
                  />
                </div>

                {/* Revenue chart */}
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
                      <CardTitle>
                        Monthly Revenue vs Collected (Real Data)
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {chartData.length === 0 ? (
                        <div
                          style={{
                            height: 180,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#8892a4",
                            fontSize: 12,
                          }}
                        >
                          No order data yet — create orders to see revenue chart
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart
                            data={ordersByMonth}
                            barSize={10}
                            barGap={2}
                          >
                            <XAxis
                              dataKey="m"
                              tick={{ fill: "#8892a4", fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                              content={<TT />}
                              cursor={{ fill: "rgba(255,255,255,.02)" }}
                            />
                            <Bar
                              dataKey="rev"
                              name="Revenue"
                              fill="#3b82f6"
                              radius={[3, 3, 0, 0]}
                            />
                            <Bar
                              dataKey="collected"
                              name="Collected"
                              fill="#10b981"
                              radius={[3, 3, 0, 0]}
                              opacity={0.8}
                            />
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
                      {pieData.length === 0 ? (
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
                      ) : (
                        <>
                          <PieChart
                            width={140}
                            height={140}
                            style={{ margin: "0 auto" }}
                          >
                            <Pie
                              data={pieData}
                              cx={65}
                              cy={65}
                              innerRadius={38}
                              outerRadius={65}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {pieData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                          {pieData.map((item, i) => (
                            <div
                              key={item.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 5,
                                fontSize: 11,
                              }}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 2,
                                  background: COLORS[i % COLORS.length],
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ flex: 1, color: "#8892a4" }}>
                                {item.name}
                              </span>
                              <span style={{ fontWeight: 600 }}>
                                {item.value}
                              </span>
                              <span style={{ color: "#8892a4", fontSize: 10 }}>
                                {formatCurrency(revenueByType[item.name] || 0)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </CardBody>
                  </Card>
                </div>

                {/* Priority + Overdue */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders by Priority</CardTitle>
                    </CardHeader>
                    <CardBody>
                      {[
                        {
                          label: "Normal",
                          count: byPriority.NORMAL,
                          color: "#10b981",
                          bg: "rgba(16,185,129,.1)",
                        },
                        {
                          label: "Urgent",
                          count: byPriority.URGENT,
                          color: "#f59e0b",
                          bg: "rgba(245,158,11,.1)",
                        },
                        {
                          label: "Express",
                          count: byPriority.EXPRESS,
                          color: "#ef4444",
                          bg: "rgba(239,68,68,.1)",
                        },
                      ].map((p) => (
                        <div
                          key={p.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 80,
                              fontSize: 12,
                              color: "#8892a4",
                            }}
                          >
                            {p.label}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              background: "#252d40",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${totalOrders ? Math.round((p.count / totalOrders) * 100) : 0}%`,
                                background: p.color,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              width: 30,
                              textAlign: "right",
                              fontWeight: 700,
                              color: p.color,
                            }}
                          >
                            {p.count}
                          </div>
                          <div
                            style={{
                              width: 35,
                              fontSize: 10,
                              color: "#8892a4",
                            }}
                          >
                            {totalOrders
                              ? Math.round((p.count / totalOrders) * 100)
                              : 0}
                            %
                          </div>
                        </div>
                      ))}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        ⚠️ Overdue Orders ({overdueOrders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {overdueOrders.length === 0 ? (
                        <div
                          style={{
                            color: "#10b981",
                            fontSize: 13,
                            textAlign: "center",
                            padding: 16,
                          }}
                        >
                          🎉 No overdue orders!
                        </div>
                      ) : (
                        <div style={{ maxHeight: 150, overflowY: "auto" }}>
                          {overdueOrders.map((o) => (
                            <div
                              key={o.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "6px 0",
                                borderBottom: "1px solid #2a3348",
                                fontSize: 12,
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    color: "#3b82f6",
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {o.orderNo}
                                </span>
                                <span
                                  style={{ color: "#e2e8f0", marginLeft: 8 }}
                                >
                                  {o.customer?.name}
                                </span>
                              </div>
                              <div
                                style={{
                                  color: "#ef4444",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Due:{" "}
                                {new Date(o.dueDate).toLocaleDateString(
                                  "en-IN",
                                  { day: "2-digit", month: "short" },
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}

            {/* ── ORDERS TAB ── */}
            {tab === "Orders" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <StatCard
                    label="Total Orders"
                    value={totalOrders}
                    icon="📋"
                    color="blue"
                  />
                  <StatCard
                    label="Delivered"
                    value={deliveredCount}
                    icon="✅"
                    color="green"
                  />
                  <StatCard
                    label="Pending"
                    value={orders.filter((o) => o.status === "PENDING").length}
                    icon="🔴"
                    color="red"
                  />
                  <StatCard
                    label="Cancelled"
                    value={
                      orders.filter((o) => o.status === "CANCELLED").length
                    }
                    icon="❌"
                    color="red"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders by Status</CardTitle>
                    </CardHeader>
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Count</th>
                            <th>Revenue</th>
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(ORDER_STATUS).map(([key, val]) => {
                            const statusOrders = orders.filter(
                              (o) => o.status === key,
                            );
                            const count = statusOrders.length;
                            const rev = statusOrders.reduce(
                              (s, o) => s + (o.totalAmount || 0),
                              0,
                            );
                            const pct = totalOrders
                              ? Math.round((count / totalOrders) * 100)
                              : 0;
                            return (
                              <tr key={key}>
                                <td>
                                  <Badge color={(val as any).color}>
                                    {(val as any).icon} {(val as any).label}
                                  </Badge>
                                </td>
                                <td style={{ fontWeight: 600 }}>{count}</td>
                                <td style={{ color: "#10b981" }}>
                                  {formatCurrency(rev)}
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        flex: 1,
                                        height: 5,
                                        background: "#252d40",
                                        borderRadius: 3,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${pct}%`,
                                          background: "#3b82f6",
                                          borderRadius: 3,
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        color: "#8892a4",
                                        fontSize: 10,
                                        minWidth: 28,
                                      }}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Order Type</CardTitle>
                    </CardHeader>
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                            <th>Avg Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            revenueByType as Record<string, number>,
                          )
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, rev]) => {
                              const typeOrders = orders.filter(
                                (o: any) => o.orderType === type,
                              );

                              const avg = typeOrders.length
                                ? Math.round(rev / typeOrders.length)
                                : 0;

                              return (
                                <tr key={type}>
                                  <td>
                                    <Badge color="blue">{type}</Badge>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {typeOrders.length}
                                  </td>
                                  <td
                                    style={{
                                      color: "#10b981",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {formatCurrency(rev as number)}
                                  </td>
                                  <td style={{ color: "#8892a4" }}>
                                    {formatCurrency(avg)}
                                  </td>
                                </tr>
                              );
                            })}
                          {Object.keys(revenueByType).length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                style={{
                                  textAlign: "center",
                                  color: "#8892a4",
                                  padding: 20,
                                }}
                              >
                                No orders yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ── CUSTOMERS TAB ── */}
            {tab === "Customers" && (
              <div>
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
                    label="With Orders"
                    value={customers.filter((c) => c.totalOrders > 0).length}
                    icon="📋"
                    color="green"
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(
                      customers.reduce(
                        (s, c) => s + (c.totalBusiness - c.totalPaid),
                        0,
                      ),
                    )}
                    icon="⏳"
                    color="yellow"
                  />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Customer-wise Report</CardTitle>
                  </CardHeader>
                  {customers.length === 0 ? (
                    <div
                      style={{
                        padding: 20,
                        color: "#8892a4",
                        textAlign: "center",
                        fontSize: 12,
                      }}
                    >
                      No customers yet
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>City</th>
                            <th>Orders</th>
                            <th>Total Business</th>
                            <th>Collected</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers
                            .sort((a, b) => b.totalBusiness - a.totalBusiness)
                            .map((c) => {
                              const outstanding = c.totalBusiness - c.totalPaid;
                              return (
                                <tr key={c.id}>
                                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                                  <td style={{ color: "#8892a4" }}>
                                    {c.city || "—"}
                                  </td>
                                  <td
                                    style={{
                                      fontWeight: 600,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.totalOrders}
                                  </td>
                                  <td
                                    style={{
                                      color: "#10b981",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {formatCurrency(c.totalBusiness)}
                                  </td>
                                  <td style={{ color: "#3b82f6" }}>
                                    {formatCurrency(c.totalPaid)}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        outstanding > 0 ? "#ef4444" : "#10b981",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {formatCurrency(outstanding)}
                                  </td>
                                  <td>
                                    <Badge
                                      color={outstanding > 0 ? "red" : "green"}
                                    >
                                      {outstanding > 0 ? "Due" : "Clear"}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── MONTHLY P&L TAB ── */}
            {tab === "Monthly P&L" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <StatCard
                    label="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon="📈"
                    color="blue"
                  />
                  <StatCard
                    label="Total Collected"
                    value={formatCurrency(totalCollected)}
                    icon="✅"
                    color="green"
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(totalBalance)}
                    icon="⏳"
                    color="yellow"
                  />
                  <StatCard
                    label="Collection Rate"
                    value={`${totalRevenue ? Math.round((totalCollected / totalRevenue) * 100) : 0}%`}
                    icon="🎯"
                    color="green"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardBody>
                      {chartData.length === 0 ? (
                        <div
                          style={{
                            height: 160,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#8892a4",
                            fontSize: 12,
                          }}
                        >
                          No order data yet
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={ordersByMonth}>
                            <XAxis
                              dataKey="m"
                              tick={{ fill: "#8892a4", fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip content={<TT />} />
                            <Line
                              type="monotone"
                              dataKey="rev"
                              name="Revenue"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ fill: "#3b82f6", r: 3 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="collected"
                              name="Collected"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={{ fill: "#10b981", r: 3 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="balance"
                              name="Balance"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ fill: "#ef4444", r: 3 }}
                              strokeDasharray="4 2"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardBody>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Breakdown (Real Order Data)</CardTitle>
                  </CardHeader>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Orders</th>
                          <th>Revenue</th>
                          <th>Collected</th>
                          <th>Balance</th>
                          <th>Collection %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersByMonth.map((m) => {
                          const rate = m.rev
                            ? Math.round((m.collected / m.rev) * 100)
                            : 0;
                          const isEmpty = m.rev === 0 && m.count === 0;
                          return (
                            <tr
                              key={m.m}
                              style={{ opacity: isEmpty ? 0.4 : 1 }}
                            >
                              <td style={{ fontWeight: 600 }}>{m.m}</td>
                              <td
                                style={{ textAlign: "center", fontWeight: 600 }}
                              >
                                {m.count || "—"}
                              </td>
                              <td style={{ color: "#10b981", fontWeight: 600 }}>
                                {m.rev ? formatCurrency(m.rev) : "—"}
                              </td>
                              <td style={{ color: "#3b82f6" }}>
                                {m.collected
                                  ? formatCurrency(m.collected)
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  color: m.balance > 0 ? "#ef4444" : "#10b981",
                                  fontWeight: 600,
                                }}
                              >
                                {m.balance ? formatCurrency(m.balance) : "—"}
                              </td>
                              <td>
                                {m.rev > 0 ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        flex: 1,
                                        height: 5,
                                        background: "#252d40",
                                        borderRadius: 3,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${rate}%`,
                                          background:
                                            rate >= 80
                                              ? "#10b981"
                                              : rate >= 50
                                                ? "#f59e0b"
                                                : "#ef4444",
                                          borderRadius: 3,
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        color: "#8892a4",
                                        fontSize: 10,
                                        minWidth: 32,
                                      }}
                                    >
                                      {rate}%
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    style={{ color: "#8892a4", fontSize: 11 }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#1e2535", fontWeight: 700 }}>
                          <td>TOTAL</td>
                          <td style={{ textAlign: "center" }}>{totalOrders}</td>
                          <td style={{ color: "#10b981" }}>
                            {formatCurrency(totalRevenue)}
                          </td>
                          <td style={{ color: "#3b82f6" }}>
                            {formatCurrency(totalCollected)}
                          </td>
                          <td style={{ color: "#ef4444" }}>
                            {formatCurrency(totalBalance)}
                          </td>
                          <td style={{ color: "#8892a4" }}>
                            {totalRevenue
                              ? Math.round(
                                  (totalCollected / totalRevenue) * 100,
                                )
                              : 0}
                            %
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
