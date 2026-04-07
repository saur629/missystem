'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Modal, FormGroup, Input, Select, Textarea, StatCard, Loading, Empty } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SmsPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ customerId:'', mobile:'', templateId:'', message:'' })
  const f = (k: string, v: string) => setForm(p=>({...p,[k]:v}))

  useEffect(() => {
    Promise.all([fetch('/api/sms').then(r=>r.json()), fetch('/api/customers').then(r=>r.json())])
      .then(([smsData,cls]) => { setTemplates(smsData.templates||[]); setLogs(smsData.logs||[]); setCustomers(Array.isArray(cls)?cls:[]); setLoading(false) })
  }, [])

  function applyTemplate(tplId: string) {
    const tpl = templates.find(t=>t.id===tplId)
    if (!tpl) return
    const cust = customers.find(c=>c.id===form.customerId)
    let msg = tpl.content
      .replace('{name}', cust?.name||'Customer')
      .replace('{phone}', process.env.NEXT_PUBLIC_SHOP_PHONE||'9876500000')
    setForm(p=>({...p, templateId:tplId, message:msg, mobile:cust?.mobile||p.mobile}))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.mobile || !form.message) { toast.error('Mobile and message required'); return }
    setSending(true)
    try {
      const res = await fetch('/api/sms', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mobile:form.mobile, message:form.message, template:templates.find(t=>t.id===form.templateId)?.name, customerId:form.customerId||null }) })
      const data = await res.json()
      setLogs(p=>[data,...p])
      setShowModal(false)
      setForm({ customerId:'', mobile:'', templateId:'', message:'' })
      toast.success('📱 SMS sent!')
    } catch { toast.error('Failed to send') }
    setSending(false)
  }

  const delivered = logs.filter(l=>l.status==='SENT').length

  return (
    <PageShell title="SMS Alerts" action={{ label:'📱 Send SMS', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Sent This Month" value={logs.length} icon="📱" color="blue" />
          <StatCard label="Delivered" value={delivered} icon="✅" color="green" />
          <StatCard label="Failed" value={logs.length-delivered} icon="❌" color="red" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Templates */}
          <Card>
            <CardHeader><CardTitle>SMS Templates</CardTitle><Button variant="primary" onClick={()=>setShowModal(true)}>📱 Send SMS</Button></CardHeader>
            <CardBody>
              {templates.length===0 ? <Empty message="No templates" /> : templates.map(tpl=>(
                <div key={tpl.id} style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:'10px 12px', marginBottom:8, cursor:'pointer', transition:'border-color .15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#3b82f6')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#2a3348')}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{tpl.name}</span>
                    {tpl.isAuto && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:8, background:'rgba(59,130,246,.15)', color:'#3b82f6', fontWeight:600 }}>AUTO</span>}
                    {tpl.trigger && <Badge color="gray">{tpl.trigger}</Badge>}
                  </div>
                  <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.5 }}>{tpl.content}</div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* SMS Log */}
          <Card>
            <CardHeader><CardTitle>SMS Log ({logs.length})</CardTitle></CardHeader>
            {loading ? <Loading /> : logs.length===0 ? <Empty message="No SMS sent yet" /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Time</th><th>Mobile</th><th>Template</th><th>Message</th><th>Status</th></tr></thead>
                  <tbody>
                    {logs.map(log=>(
                      <tr key={log.id}>
                        <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>{formatDate(log.sentAt)}</td>
                        <td style={{ fontFamily:'monospace', fontSize:11 }}>{log.mobile}</td>
                        <td style={{ color:'#8892a4', fontSize:11 }}>{log.template||'Custom'}</td>
                        <td style={{ color:'#8892a4', fontSize:11, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.message}</td>
                        <td><Badge color={log.status==='SENT'?'green':'red'}>{log.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Send SMS"
        footer={<><Button onClick={()=>setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSend} disabled={sending}>{sending?'Sending...':'📱 Send SMS'}</Button></>}>
        <form onSubmit={handleSend}>
          <FormGroup label="Customer (Optional)">
            <Select value={form.customerId} onChange={e=>{ f('customerId',e.target.value); const c=customers.find(c=>c.id===e.target.value); if(c) f('mobile',c.mobile) }}>
              <option value="">Manual Entry</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Mobile Number *"><Input value={form.mobile} onChange={e=>f('mobile',e.target.value)} placeholder="10-digit mobile" required /></FormGroup>
          <FormGroup label="Use Template">
            <Select value={form.templateId} onChange={e=>applyTemplate(e.target.value)}>
              <option value="">Select template...</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Message *">
            <Textarea value={form.message} onChange={e=>f('message',e.target.value)} rows={4} placeholder="Type your message..." required />
            <div style={{ fontSize:10, color:'#8892a4', marginTop:4, textAlign:'right' }}>{form.message.length}/160 chars</div>
          </FormGroup>
          <div style={{ background:'#1e2535', borderRadius:8, padding:10, fontSize:11, color:'#8892a4', lineHeight:1.8 }}>
            <b style={{ color:'#e2e8f0' }}>Variables:</b> {'{name}'} {'{orderNo}'} {'{invNo}'} {'{amount}'} {'{phone}'}
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
