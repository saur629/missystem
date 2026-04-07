'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Select, Loading, Empty, StatCard } from '@/components/ui'
import toast from 'react-hot-toast'

const STATUS_COLOR: Record<string,string> = { PRESENT:'green', ABSENT:'red', LATE:'yellow', LEAVE:'purple', HALF_DAY:'orange' }
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function AttendancePage() {
  const now = new Date()
  const [users, setUsers] = useState<any[]>([])
  const [todayAtt, setTodayAtt] = useState<any[]>([])
  const [monthAtt, setMonthAtt] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)

  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = new Date(year, month).toLocaleString('en-IN', { month:'long', year:'numeric' })

  useEffect(() => {
    fetch('/api/users').then(r=>r.json()).then(us => {
      setUsers(Array.isArray(us)?us:[])
      if (us.length>0) setSelectedUser(us[0].id)
      setLoading(false)
    })
    fetchToday()
  }, [])

  useEffect(() => {
    if (!selectedUser) return
    const m = `${year}-${String(month+1).padStart(2,'0')}`
    fetch(`/api/attendance?userId=${selectedUser}&month=${m}`).then(r=>r.json()).then(d=>setMonthAtt(Array.isArray(d)?d:[]))
  }, [selectedUser, year, month])

  function fetchToday() {
    fetch(`/api/attendance?date=${today}`).then(r=>r.json()).then(d=>setTodayAtt(Array.isArray(d)?d:[]))
  }

  function getDayStatus(day: number) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return monthAtt.find(a => a.date?.startsWith(dateStr))?.status
  }

  async function markAtt(userId: string, status: string) {
    const res = await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId, date:today, status, checkIn: ['PRESENT','LATE'].includes(status) ? new Date().toTimeString().slice(0,5) : null }) })
    if (res.ok) { fetchToday(); toast.success(`Marked ${status}`) }
  }

  const present = todayAtt.filter(a=>a.status==='PRESENT').length
  const absent = users.length - todayAtt.length + todayAtt.filter(a=>a.status==='ABSENT').length
  const late = todayAtt.filter(a=>a.status==='LATE').length

  const cellStyle = (status?: string): React.CSSProperties => {
    if (!status) return { aspectRatio:'1', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, background:'#1e2535', color:'#8892a4', cursor:'default' }
    const map: Record<string,{ bg:string;color:string }> = { PRESENT:{bg:'rgba(16,185,129,.2)',color:'#10b981'}, ABSENT:{bg:'rgba(239,68,68,.12)',color:'#ef4444'}, LATE:{bg:'rgba(245,158,11,.15)',color:'#f59e0b'}, LEAVE:{bg:'rgba(139,92,246,.12)',color:'#8b5cf6'}, HALF_DAY:{bg:'rgba(249,115,22,.15)',color:'#f97316'} }
    return { aspectRatio:'1', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, ...map[status], cursor:'default' }
  }

  return (
    <PageShell title="Attendance">
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Present Today" value={present} icon="✅" color="green" />
          <StatCard label="Absent" value={absent} icon="❌" color="red" />
          <StatCard label="Late / Leave" value={late} icon="⏰" color="yellow" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>{monthName}</CardTitle>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <Select style={{ width:150, padding:'4px 8px', fontSize:11 }} value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
                  {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
                <Button size="sm" onClick={()=>setMonth(m=>{ if(m===0){setYear(y=>y-1);return 11}return m-1 })}>‹</Button>
                <Button size="sm" onClick={()=>setMonth(m=>{ if(m===11){setYear(y=>y+1);return 0}return m+1 })}>›</Button>
              </div>
            </CardHeader>
            <div style={{ padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
                {DAYS.map(d=><div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'#8892a4', padding:'2px 0' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1; const status=getDayStatus(day)
                  return <div key={day} style={cellStyle(status)}>{day}</div>
                })}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
                {Object.entries({PRESENT:'#10b981',ABSENT:'#ef4444',LATE:'#f59e0b',LEAVE:'#8b5cf6'}).map(([s,c])=>(
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:`${c}30`, border:`1px solid ${c}` }}/>
                    <span style={{ color:'#8892a4' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Today */}
          <Card>
            <CardHeader>
              <CardTitle>Today — {now.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</CardTitle>
            </CardHeader>
            {loading ? <Loading /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Staff</th><th>Role</th><th>Check In</th><th>Status</th><th>Mark</th></tr></thead>
                  <tbody>
                    {users.map(user => {
                      const att = todayAtt.find(a=>a.userId===user.id)
                      return (
                        <tr key={user.id}>
                          <td style={{ fontWeight:500 }}>{user.name}</td>
                          <td style={{ fontSize:10, color:'#8892a4' }}>{user.role.replace('_',' ')}</td>
                          <td style={{ fontSize:11, color:'#8892a4' }}>{att?.checkIn||'—'}</td>
                          <td>{att ? <Badge color={STATUS_COLOR[att.status]}>{att.status}</Badge> : <span style={{ color:'#8892a4', fontSize:11 }}>Not marked</span>}</td>
                          <td>
                            <div style={{ display:'flex', gap:3 }}>
                              {['P','L','A','LV'].map((s,i)=>{
                                const statuses=['PRESENT','LATE','ABSENT','LEAVE']
                                const status=statuses[i]
                                const colors=['#10b981','#f59e0b','#ef4444','#8b5cf6']
                                return (
                                  <button key={s} onClick={()=>markAtt(user.id,status)}
                                    style={{ padding:'2px 6px', fontSize:9, borderRadius:4, border:`1px solid ${att?.status===status?colors[i]:'#2a3348'}`, background:att?.status===status?`${colors[i]}20`:'transparent', color:att?.status===status?colors[i]:'#8892a4', cursor:'pointer', fontWeight:600 }}>
                                    {s}
                                  </button>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
