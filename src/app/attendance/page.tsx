'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Select, Loading, StatCard } from '@/components/ui'
import toast from 'react-hot-toast'

const STATUS_COLOR: Record<string, string> = {
  PRESENT: 'green', ABSENT: 'red', LATE: 'yellow', LEAVE: 'purple', HALF_DAY: 'orange'
}
const STATUS_ICON: Record<string, string> = {
  PRESENT: '✅', ABSENT: '❌', LATE: '⏰', LEAVE: '🏖️', HALF_DAY: '🌓'
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(time?: string | null) {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtHours(h?: number | null) {
  if (!h) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function getWorkBadge(hours?: number | null) {
  if (!hours) return null
  if (hours >= 8)  return { label: 'Full Day', color: '#10b981' }
  if (hours >= 4)  return { label: 'Half Day', color: '#f59e0b' }
  return { label: 'Short', color: '#ef4444' }
}

export default function AttendancePage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role)

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [users, setUsers]           = useState<any[]>([])
  const [todayAtt, setTodayAtt]     = useState<any[]>([])
  const [monthAtt, setMonthAtt]     = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [year, setYear]             = useState(now.getFullYear())
  const [month, setMonth]           = useState(now.getMonth())
  const [loading, setLoading]       = useState(true)
  const [marking, setMarking]       = useState<string | null>(null)
  const [tab, setTab]               = useState<'today' | 'calendar' | 'report'>('today')

  const monthName = new Date(year, month).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const fetchToday = useCallback(() => {
    fetch(`/api/attendance?date=${today}`)
      .then(r => r.json())
      .then(d => setTodayAtt(Array.isArray(d) ? d : []))
  }, [today])

  const fetchMonth = useCallback(() => {
    if (!selectedUser) return
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    fetch(`/api/attendance?userId=${selectedUser}&month=${m}`)
      .then(r => r.json())
      .then(d => setMonthAtt(Array.isArray(d) ? d : []))
  }, [selectedUser, year, month])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(us => {
      const arr = Array.isArray(us) ? us : []
      setUsers(arr)
      if (arr.length > 0) setSelectedUser(arr[0].id)
      setLoading(false)
    })
    fetchToday()
  }, [fetchToday])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  // ── Mark attendance ──────────────────────────────────────────
  async function markAtt(userId: string, status: string) {
    setMarking(userId + status)
    const checkIn = ['PRESENT', 'LATE'].includes(status)
      ? new Date().toTimeString().slice(0, 5)
      : null
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: today, status, checkIn }),
    })
    if (res.ok) {
      fetchToday()
      toast.success(`${STATUS_ICON[status]} Marked ${status}`)
    } else {
      toast.error('Failed to mark attendance')
    }
    setMarking(null)
  }

  // ── Check out ────────────────────────────────────────────────
  async function checkOut(userId: string) {
    setMarking(userId + 'OUT')
    const checkOutTime = new Date().toTimeString().slice(0, 5)
    const res = await fetch('/api/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: today, checkOut: checkOutTime }),
    })
    if (res.ok) {
      fetchToday()
      toast.success(`🏁 Checked out at ${fmt12(checkOutTime)}`)
    } else {
      toast.error('Failed to check out')
    }
    setMarking(null)
  }

  // ── Manual time edit ─────────────────────────────────────────
  async function updateTime(userId: string, field: 'checkIn' | 'checkOut', value: string) {
    const att = todayAtt.find(a => a.userId === userId)
    if (!att) return
    const updated = {
      userId, date: today,
      status: att.status,
      checkIn:  field === 'checkIn'  ? value : att.checkIn,
      checkOut: field === 'checkOut' ? value : att.checkOut,
    }
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    fetchToday()
  }

  // ── Calendar helpers ─────────────────────────────────────────
  function getDayAtt(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthAtt.find(a => a.date?.startsWith(dateStr))
  }

  // ── Stats ────────────────────────────────────────────────────
  const present   = todayAtt.filter(a => a.status === 'PRESENT').length
  const late      = todayAtt.filter(a => a.status === 'LATE').length
  const onLeave   = todayAtt.filter(a => a.status === 'LEAVE').length
  const absent    = users.length - todayAtt.filter(a => ['PRESENT','LATE','HALF_DAY'].includes(a.status)).length
  const checkedIn = todayAtt.filter(a => a.checkIn && !a.checkOut).length

  // ── Monthly report stats ─────────────────────────────────────
  const selectedUserData = users.find(u => u.id === selectedUser)
  const totalPresent  = monthAtt.filter(a => a.status === 'PRESENT').length
  const totalLate     = monthAtt.filter(a => a.status === 'LATE').length
  const totalAbsent   = monthAtt.filter(a => a.status === 'ABSENT').length
  const totalLeave    = monthAtt.filter(a => a.status === 'LEAVE').length
  const totalHours    = monthAtt.reduce((s, a) => s + (a.workHours || 0), 0)
  const avgHours      = monthAtt.filter(a => a.workHours).length
    ? totalHours / monthAtt.filter(a => a.workHours).length
    : 0

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: tab === t ? '#3b82f6' : 'transparent',
    color: tab === t ? '#fff' : '#8892a4',
  })

  return (
    <PageShell title="Attendance">
      <div className="animate-in">

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Present"    value={present}   icon="✅" color="green" />
          <StatCard label="Late"       value={late}      icon="⏰" color="yellow" />
          <StatCard label="Absent"     value={absent}    icon="❌" color="red" />
          <StatCard label="On Leave"   value={onLeave}   icon="🏖️" color="purple" />
          <StatCard label="Checked In" value={checkedIn} icon="🏢" color="blue" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#161b27', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid #2a3348' }}>
          <button style={tabStyle('today')}    onClick={() => setTab('today')}>📋 Today</button>
          <button style={tabStyle('calendar')} onClick={() => setTab('calendar')}>📅 Calendar</button>
          <button style={tabStyle('report')}   onClick={() => setTab('report')}>📊 Monthly Report</button>
        </div>

        {/* ── TODAY TAB ── */}
        {tab === 'today' && (
          <Card>
            <CardHeader>
              <CardTitle>
                Today — {now.toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
              </CardTitle>
              <Button onClick={fetchToday}>🔄 Refresh</Button>
            </CardHeader>
            {loading ? <Loading /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Work Hours</th>
                      <th>Mark Status</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const att = todayAtt.find(a => a.userId === user.id)
                      const isCheckedIn  = att?.checkIn && !att?.checkOut
                      const isCheckedOut = att?.checkIn && att?.checkOut
                      const badge = getWorkBadge(att?.workHours)

                      return (
                        <tr key={user.id}>
                          {/* Name */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                                {isCheckedIn && (
                                  <div style={{ fontSize: 10, color: '#10b981' }}>🟢 Currently in office</div>
                                )}
                                {isCheckedOut && (
                                  <div style={{ fontSize: 10, color: '#8892a4' }}>🔴 Checked out</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ fontSize: 11, color: '#8892a4' }}>{user.role.replace('_', ' ')}</td>

                          {/* Status */}
                          <td>
                            {att
                              ? <Badge color={STATUS_COLOR[att.status]}>{STATUS_ICON[att.status]} {att.status}</Badge>
                              : <span style={{ fontSize: 11, color: '#4a5568' }}>Not marked</span>
                            }
                          </td>

                          {/* Check In */}
                          <td>
                            {isAdmin && att?.checkIn ? (
                              <input
                                type="time"
                                defaultValue={att.checkIn}
                                onBlur={e => updateTime(user.id, 'checkIn', e.target.value)}
                                style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#10b981', padding: '3px 6px', fontSize: 12, fontWeight: 600 }}
                              />
                            ) : (
                              <span style={{ fontSize: 12, color: att?.checkIn ? '#10b981' : '#4a5568', fontWeight: 600 }}>
                                {att?.checkIn ? fmt12(att.checkIn) : '—'}
                              </span>
                            )}
                          </td>

                          {/* Check Out */}
                          <td>
                            {isAdmin && att?.checkOut ? (
                              <input
                                type="time"
                                defaultValue={att.checkOut}
                                onBlur={e => updateTime(user.id, 'checkOut', e.target.value)}
                                style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#ef4444', padding: '3px 6px', fontSize: 12, fontWeight: 600 }}
                              />
                            ) : (
                              <span style={{ fontSize: 12, color: att?.checkOut ? '#ef4444' : '#4a5568', fontWeight: 600 }}>
                                {att?.checkOut ? fmt12(att.checkOut) : isCheckedIn ? (
                                  <span style={{ color: '#f59e0b', fontSize: 11 }}>In progress...</span>
                                ) : '—'}
                              </span>
                            )}
                          </td>

                          {/* Work Hours */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: att?.workHours ? '#10b981' : '#4a5568' }}>
                                {fmtHours(att?.workHours)}
                              </span>
                              {badge && (
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${badge.color}20`, color: badge.color, fontWeight: 700, width: 'fit-content' }}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Mark Status buttons */}
                          <td>
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {[
                                { s: 'PRESENT', label: 'P', color: '#10b981' },
                                { s: 'LATE',    label: 'L', color: '#f59e0b' },
                                { s: 'ABSENT',  label: 'A', color: '#ef4444' },
                                { s: 'LEAVE',   label: 'LV', color: '#8b5cf6' },
                                { s: 'HALF_DAY',label: 'H', color: '#f97316' },
                              ].map(({ s, label, color }) => (
                                <button key={s}
                                  onClick={() => markAtt(user.id, s)}
                                  disabled={marking === user.id + s}
                                  title={s}
                                  style={{
                                    padding: '3px 7px', fontSize: 10, borderRadius: 5, cursor: 'pointer', fontWeight: 700,
                                    border: `1px solid ${att?.status === s ? color : '#2a3348'}`,
                                    background: att?.status === s ? `${color}25` : '#1e2535',
                                    color: att?.status === s ? color : '#8892a4',
                                    transition: 'all .15s',
                                  }}>
                                  {marking === user.id + s ? '...' : label}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Check Out button */}
                          {isAdmin && (
                            <td>
                              {isCheckedIn ? (
                                <button
                                  onClick={() => checkOut(user.id)}
                                  disabled={marking === user.id + 'OUT'}
                                  style={{ padding: '5px 10px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 7, color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                  {marking === user.id + 'OUT' ? '...' : '🏁 Check Out'}
                                </button>
                              ) : att?.checkOut ? (
                                <span style={{ fontSize: 10, color: '#4a5568' }}>Done</span>
                              ) : null}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── CALENDAR TAB ── */}
        {tab === 'calendar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            <Card>
              <CardHeader>
                <CardTitle>{monthName}</CardTitle>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Select style={{ width: 160, fontSize: 12 }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                  <button onClick={() => setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 })}
                    style={{ padding: '4px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer' }}>‹</button>
                  <button onClick={() => setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 })}
                    style={{ padding: '4px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer' }}>›</button>
                </div>
              </CardHeader>
              <div style={{ padding: 16 }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#8892a4', padding: '2px 0' }}>{d}</div>
                  ))}
                </div>
                {/* Calendar cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const att = getDayAtt(day)
                    const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
                    const isSunday = new Date(year, month, day).getDay() === 0
                    const statusColors: Record<string, { bg: string; color: string }> = {
                      PRESENT:  { bg: 'rgba(16,185,129,.2)',  color: '#10b981' },
                      ABSENT:   { bg: 'rgba(239,68,68,.15)',  color: '#ef4444' },
                      LATE:     { bg: 'rgba(245,158,11,.15)', color: '#f59e0b' },
                      LEAVE:    { bg: 'rgba(139,92,246,.15)', color: '#8b5cf6' },
                      HALF_DAY: { bg: 'rgba(249,115,22,.15)', color: '#f97316' },
                    }
                    const sc = att ? statusColors[att.status] : null

                    return (
                      <div key={day} style={{
                        borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                        background: sc ? sc.bg : isSunday ? 'rgba(239,68,68,.04)' : '#1e2535',
                        border: `1px solid ${isToday ? '#3b82f6' : sc ? `${sc.color}40` : '#2a3348'}`,
                        cursor: 'default', minHeight: 52,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? '#3b82f6' : isSunday ? '#ef444460' : '#e2e8f0', marginBottom: 2 }}>
                          {day}
                        </div>
                        {att ? (
                          <>
                            <div style={{ fontSize: 9, color: sc?.color, fontWeight: 700 }}>{STATUS_ICON[att.status]}</div>
                            {att.workHours && (
                              <div style={{ fontSize: 8, color: sc?.color, marginTop: 1 }}>{fmtHours(att.workHours)}</div>
                            )}
                          </>
                        ) : isSunday ? (
                          <div style={{ fontSize: 9, color: '#4a5568' }}>OFF</div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                  {Object.entries({ PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', LEAVE: '#8b5cf6', HALF_DAY: '#f97316' }).map(([s, c]) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: `${c}30`, border: `1px solid ${c}` }} />
                      <span style={{ color: '#8892a4' }}>{s.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Selected user monthly summary sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card>
                <CardHeader><CardTitle>📊 {selectedUserData?.name?.split(' ')[0]}'s Summary</CardTitle></CardHeader>
                <div style={{ padding: '0 14px 14px' }}>
                  {[
                    { label: 'Present Days',  value: totalPresent,        color: '#10b981', icon: '✅' },
                    { label: 'Late Days',     value: totalLate,           color: '#f59e0b', icon: '⏰' },
                    { label: 'Absent Days',   value: totalAbsent,         color: '#ef4444', icon: '❌' },
                    { label: 'Leave Days',    value: totalLeave,          color: '#8b5cf6', icon: '🏖️' },
                    { label: 'Total Hours',   value: fmtHours(totalHours), color: '#3b82f6', icon: '⏱️' },
                    { label: 'Avg Hours/Day', value: fmtHours(avgHours),  color: '#14b8a6', icon: '📈' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e2535' }}>
                      <span style={{ fontSize: 12, color: '#8892a4' }}>{icon} {label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent check-in/out log */}
              <Card>
                <CardHeader><CardTitle>🕐 Time Log</CardTitle></CardHeader>
                <div style={{ padding: '0 14px 14px', maxHeight: 300, overflowY: 'auto' }}>
                  {monthAtt.filter(a => a.checkIn).slice(0, 10).map((a: any) => (
                    <div key={a.id} style={{ padding: '7px 0', borderBottom: '1px solid #1e2535', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>
                          {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 10, color: '#8892a4', marginTop: 2 }}>
                          {fmt12(a.checkIn)} → {a.checkOut ? fmt12(a.checkOut) : '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Badge color={STATUS_COLOR[a.status]}>{STATUS_ICON[a.status]}</Badge>
                        {a.workHours && (
                          <div style={{ fontSize: 10, color: '#10b981', marginTop: 3, fontWeight: 600 }}>{fmtHours(a.workHours)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {monthAtt.filter(a => a.checkIn).length === 0 && (
                    <div style={{ color: '#4a5568', fontSize: 12, textAlign: 'center', padding: 16 }}>No time logs yet</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── MONTHLY REPORT TAB ── */}
        {tab === 'report' && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Monthly Report — {monthName}</CardTitle>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 })}
                  style={{ padding: '4px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer' }}>‹ Prev</button>
                <button onClick={() => setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 })}
                  style={{ padding: '4px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer' }}>Next ›</button>
              </div>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Late</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>Leave</th>
                    <th style={{ textAlign: 'center' }}>Half Day</th>
                    <th style={{ textAlign: 'center' }}>Total Hours</th>
                    <th style={{ textAlign: 'center' }}>Avg/Day</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(async_user => {
                    // We fetch per user from monthAtt — but monthAtt is for selectedUser only
                    // So for report tab we show all users with a per-user fetch
                    return <ReportRow key={async_user.id} user={async_user} year={year} month={month} daysInMonth={daysInMonth} />
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>
    </PageShell>
  )
}

// ── Per-user report row ────────────────────────────────────────
function ReportRow({ user, year, month, daysInMonth }: { user: any; year: number; month: number; daysInMonth: number }) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    fetch(`/api/attendance?userId=${user.id}&month=${m}`)
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
  }, [user.id, year, month])

  const present  = data.filter(a => a.status === 'PRESENT').length
  const late     = data.filter(a => a.status === 'LATE').length
  const absent   = data.filter(a => a.status === 'ABSENT').length
  const leave    = data.filter(a => a.status === 'LEAVE').length
  const halfDay  = data.filter(a => a.status === 'HALF_DAY').length
  const totalHrs = data.reduce((s, a) => s + (a.workHours || 0), 0)
  const workDays = data.filter(a => a.workHours).length
  const avgHrs   = workDays ? totalHrs / workDays : 0
  const workingDaysInMonth = daysInMonth - Math.floor(daysInMonth / 7) // approx excluding Sundays
  const attPct   = workingDaysInMonth > 0 ? Math.round(((present + late) / workingDaysInMonth) * 100) : 0

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
            <div style={{ fontSize: 10, color: '#8892a4' }}>{user.role.replace('_', ' ')}</div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{present}</td>
      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{late}</td>
      <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{absent}</td>
      <td style={{ textAlign: 'center', color: '#8b5cf6', fontWeight: 700 }}>{leave}</td>
      <td style={{ textAlign: 'center', color: '#f97316', fontWeight: 700 }}>{halfDay}</td>
      <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>{fmtHours(totalHrs)}</td>
      <td style={{ textAlign: 'center', color: '#14b8a6', fontWeight: 700 }}>{fmtHours(avgHrs)}</td>
      <td style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <div style={{ width: 60, height: 6, background: '#1e2535', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${attPct}%`, height: '100%', background: attPct >= 90 ? '#10b981' : attPct >= 75 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: attPct >= 90 ? '#10b981' : attPct >= 75 ? '#f59e0b' : '#ef4444' }}>{attPct}%</span>
        </div>
      </td>
    </tr>
  )
}