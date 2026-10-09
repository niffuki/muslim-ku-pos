import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

declare global {
  interface Window {
    firebase: any
  }
}

type Product = {
  id: string
  name: string
  price: number
  color?: string
  image?: string
}
type BillItem = { name: string; qty: number; total: number }
type Bill = {
  id: string
  queue?: string | number
  date: string
  time: string
  items: BillItem[]
  total: number
  paymentMethod: string
  cashReceived?: number
  change?: number
  createdAt?: { seconds?: number }
}
type CartItem = { product: Product; quantity: number }

const palette = ['bg-red-500','bg-orange-500','bg-amber-500','bg-yellow-500','bg-lime-500','bg-green-500','bg-emerald-500','bg-teal-500','bg-cyan-500','bg-sky-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-purple-500','bg-fuchsia-500','bg-pink-500']
const today = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const money = (n: number) => '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const db = () => window.firebase.firestore()

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="rounded-xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-800">{title}</h2>{action}</div><div className="p-5">{children}</div></section>
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={onClose}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><h2 className="text-lg font-bold">{title}</h2><button className="rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Close">✕</button></div><div className="p-6">{children}</div></div></div>
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>
}
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [tab, setTab] = useState<'pos' | 'products' | 'summary'>('pos')
  const [cloudStatus, setCloudStatus] = useState('กำลังเชื่อมต่อ...')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [posSearch, setPosSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [summaryDate, setSummaryDate] = useState(today())
  const [queue, setQueue] = useState('1')
  const [noQueue, setNoQueue] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [productModal, setProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productColor, setProductColor] = useState('bg-blue-500')
  const [productImage, setProductImage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!window.firebase) {
      setCloudStatus('ไม่พบ Firebase SDK')
      setError('โหลด Firebase ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
      return
    }
    const store = db()
    const unsubscribeProducts = store.collection('products').onSnapshot((snapshot: any) => {
      setProducts(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Product)))
      setCloudStatus('เชื่อมต่อคลาวด์แล้ว')
    }, (e: Error) => {
      console.error(e)
      setCloudStatus('เชื่อมต่อล้มเหลว')
      setError('ไม่สามารถอ่านข้อมูลสินค้าได้ โปรดตรวจสอบ Firebase Rules')
    })
    const unsubscribeBills = store.collection('bills').onSnapshot((snapshot: any) => {
      setBills(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Bill)))
    }, (e: Error) => {
      console.error(e)
      setError('ไม่สามารถอ่านประวัติการขายได้')
    })
    return () => { unsubscribeProducts(); unsubscribeBills() }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const cartQty = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const visibleProducts = products.filter(p => (p.name || '').toLowerCase().includes(posSearch.toLowerCase().trim()))
  const managedProducts = products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase().trim()))
  const dailyBills = bills.filter(b => b.date === summaryDate).sort((a, b) => (b.time || '').localeCompare(a.time || ''))
  const summary = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; total: number }>()
    let revenue = 0, cash = 0, promptpay = 0, qty = 0
    dailyBills.forEach(bill => {
      revenue += Number(bill.total || 0)
      if (bill.paymentMethod === 'พร้อมเพย์') promptpay += Number(bill.total || 0)
      else cash += Number(bill.total || 0)
      ;(bill.items || []).forEach(item => {
        qty += Number(item.qty || 0)
        const prev = itemMap.get(item.name) || { name: item.name, qty: 0, total: 0 }
        prev.qty += Number(item.qty || 0)
        prev.total += Number(item.total || 0)
        itemMap.set(item.name, prev)
      })
    })
    return { revenue, cash, promptpay, qty, items: Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty) }
  }, [dailyBills])

  const addToCart = (product: Product) => setCart(current => {
    const existing = current.find(item => item.product.id === product.id)
    return existing
      ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { product, quantity: 1 }]
  })
  const changeQuantity = (id: string, delta: number) => setCart(current => current.map(item => item.product.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0))
  const notifyError = (message: string) => setError(message)

  const openProduct = (product?: Product) => {
    setEditingProduct(product || null)
    setProductName(product?.name || '')
    setProductPrice(product ? String(product.price) : '')
    setProductColor(product?.color || 'bg-blue-500')
    setProductImage(product?.image || '')
    setProductModal(true)
  }
  const saveProduct = async (event: FormEvent) => {
    event.preventDefault()
    const name = productName.trim()
    const price = Number(productPrice)
    if (!name || productPrice.trim() === '' || !Number.isFinite(price) || price < 0) {
      notifyError('กรุณากรอกชื่อสินค้าและราคาที่ถูกต้อง')
      return
    }
    setBusy(true)
    try {
      const data = { name, price, color: productColor, image: productImage }
      if (editingProduct) await db().collection('products').doc(editingProduct.id).update(data)
      else await db().collection('products').add(data)
      setProductModal(false)
      setToast(editingProduct ? 'บันทึกการแก้ไขสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว')
    } catch (e) {
      console.error(e)
      notifyError('บันทึกสินค้าไม่สำเร็จ กรุณาตรวจสอบ Firebase Rules')
    } finally { setBusy(false) }
  }
  const deleteProduct = async (product: Product) => {
    if (!window.confirm('ต้องการลบสินค้า "' + product.name + '" ใช่หรือไม่?')) return
    try {
      await db().collection('products').doc(product.id).delete()
      setToast('ลบสินค้าแล้ว')
      setCart(current => current.filter(item => item.product.id !== product.id))
    } catch (e) {
      console.error(e)
      notifyError('ลบสินค้าไม่สำเร็จ')
    }
  }
  const checkout = async () => {
    if (!cart.length) return
    const received = paymentMethod === 'cash' ? (cashReceived.trim() === '' ? cartTotal : Number(cashReceived)) : cartTotal
    if (paymentMethod === 'cash' && (!Number.isFinite(received) || received < cartTotal)) {
      notifyError('จำนวนเงินที่รับมาไม่เพียงพอ')
      return
    }
    setBusy(true)
    const now = new Date()
    const date = today()
    const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0')
    try {
      await db().collection('bills').add({
        queue: noQueue ? '-' : (Number.parseInt(queue, 10) || 1),
        date, time, createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        items: cart.map(item => ({ name: item.product.name, qty: item.quantity, total: item.product.price * item.quantity })),
        total: cartTotal,
        paymentMethod: paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด',
        cashReceived: received,
        change: paymentMethod === 'cash' ? received - cartTotal : 0
      })
      setCart([])
      setCheckoutOpen(false)
      setCashReceived('')
      if (!noQueue) setQueue(String((Number.parseInt(queue, 10) || 1) >= 50 ? 1 : (Number.parseInt(queue, 10) || 1) + 1))
      setToast('ชำระเงินสำเร็จ ' + money(cartTotal))
    } catch (e) {
      console.error(e)
      notifyError('บันทึกบิลไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally { setBusy(false) }
  }
  const deleteBill = async (bill: Bill) => {
    if (!window.confirm('ยืนยันลบบิลยอด ' + money(bill.total) + ' เวลา ' + (bill.time || '-') + '?')) return
    try {
      await db().collection('bills').doc(bill.id).delete()
      setToast('ลบบิลแล้ว')
    } catch (e) {
      console.error(e)
      notifyError('ลบบิลไม่สำเร็จ')
    }
  }
  const exportCsv = () => {
    if (!dailyBills.length) { notifyError('ไม่พบข้อมูลการขายในวันที่เลือก'); return }
    const escape = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"'
    const rows = [['เลขบิล','คิว','เวลา','รายการสินค้า','ช่องทางชำระเงิน','ยอดรวม (บาท)']]
    dailyBills.forEach((bill, i) => rows.push(['บิล #' + (i + 1), String(bill.queue || '-'), bill.time || '-', (bill.items || []).map(item => item.qty + 'x ' + item.name).join(' | '), bill.paymentMethod || 'เงินสด', String(bill.total)]))
    const csv = '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sales_report_' + summaryDate + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  const uploadImage = (file?: File) => {
    if (!file) return
    if (file.size > 700 * 1024) { notifyError('รูปภาพใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 700 KB'); return }
    const reader = new FileReader()
    reader.onload = () => setProductImage(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  return <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-gray-50 text-gray-800">
    <header className="z-10 flex flex-wrap items-center justify-between gap-4 bg-blue-600 px-5 py-3 text-white shadow-md">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">🧾</div><div><h1 className="text-lg font-bold tracking-tight">Muslim KU POS</h1><p className="text-xs text-blue-100">Point of Sale · ระบบขายหน้าร้าน</p></div><span className={'rounded-full px-3 py-1 text-xs ' + (cloudStatus === 'เชื่อมต่อคลาวด์แล้ว' ? 'bg-green-800 text-green-100' : 'bg-blue-800 text-blue-100')}>● {cloudStatus}</span></div>
      <nav className="flex gap-1 rounded-xl bg-blue-700/60 p-1">
        {([['pos','🧾 POS'],['products','🛍️ สินค้า'],['summary','📊 สรุปยอดขาย']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={'rounded-lg px-4 py-2 text-sm font-semibold transition ' + (tab === key ? 'bg-white text-blue-700 shadow' : 'text-blue-50 hover:bg-white/10')}>{label}</button>)}
      </nav>
    </header>

    <main className="flex-1 overflow-auto p-4 md:p-6">
      {tab === 'pos' && <div className="mx-auto grid h-full max-w-[1600px] grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[420px] flex-col">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">เลือกสินค้า</h2><p className="mt-1 text-sm text-gray-500">{products.length} รายการในระบบ</p></div><div className="relative w-full sm:w-80"><span className="absolute left-3 top-2.5 text-gray-400">🔍</span><input className={inputClass + ' pl-9'} value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="ค้นหาสินค้า..." /></div></div>
          {visibleProducts.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{visibleProducts.map(product => <button key={product.id} onClick={() => addToCart(product)} className="group flex min-h-48 flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className={'mb-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl ' + (product.image ? 'bg-gray-50' : (product.color || 'bg-blue-500') + ' text-white')} >{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-4xl font-bold">{(product.name || '?').charAt(0)}</span>}</div><span className="line-clamp-2 min-h-10 text-sm font-semibold text-gray-800">{product.name}</span><span className="mt-1 font-bold text-blue-700">{money(product.price)}</span></button>)}</div> : <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><span className="text-4xl text-gray-300">📦</span><p className="mt-3 font-semibold">ไม่พบสินค้า</p><p className="mt-1 text-sm text-gray-500">ลองเปลี่ยนคำค้นหา หรือเพิ่มสินค้าในหน้าจัดการสินค้า</p><button onClick={() => { setTab('products'); openProduct() }} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">➕ เพิ่มสินค้า</button></div>}
        </section>
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white p-5"><div><h2 className="text-lg font-bold">ตะกร้าสินค้า</h2><p className="mt-0.5 text-xs text-gray-500">{cartQty} ชิ้น</p></div><button disabled={!cart.length} onClick={() => { if (window.confirm('ต้องการล้างรายการทั้งหมดหรือไม่?')) setCart([]) }} className="text-sm font-medium text-red-500 disabled:opacity-30">🗑️ ล้างรายการ</button></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/70 p-4">{cart.length ? cart.map(item => <div key={item.product.id} className="rounded-xl border border-gray-100 bg-white p-3"><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{item.product.name}</span><button onClick={() => setCart(current => current.filter(row => row.product.id !== item.product.id))} className="text-gray-400 hover:text-red-500">✕</button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-lg border border-gray-200"><button onClick={() => changeQuantity(item.product.id,-1)} className="h-8 w-8 font-bold hover:bg-gray-100">−</button><span className="w-8 text-center text-sm font-semibold">{item.quantity}</span><button onClick={() => changeQuantity(item.product.id,1)} className="h-8 w-8 font-bold hover:bg-gray-100">+</button></div><span className="font-bold">{money(item.product.price * item.quantity)}</span></div></div>) : <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-gray-400"><span className="text-4xl">🛒</span><p className="mt-3 text-sm">ยังไม่มีสินค้าในตะกร้า</p><p className="mt-1 text-xs">เลือกสินค้าจากรายการด้านซ้าย</p></div>}</div>
          <div className="space-y-4 border-t border-gray-100 p-5"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">จำนวนสินค้า</span><span className="font-semibold">{cartQty} ชิ้น</span></div><div className="flex items-end justify-between"><span className="font-semibold">ยอดรวมสุทธิ</span><span className="text-2xl font-extrabold text-blue-700">{money(cartTotal)}</span></div><div className="rounded-xl bg-gray-50 p-3"><div className="flex items-center justify-between gap-3"><label className="text-sm font-medium">หมายเลขคิว</label><div className="flex items-center gap-2"><input type="number" min="1" max="50" disabled={noQueue} value={queue} onChange={e => setQueue(e.target.value)} className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center font-bold disabled:bg-gray-100" /><button onClick={() => setNoQueue(!noQueue)} className={'rounded-lg px-2.5 py-2 text-xs font-semibold ' + (noQueue ? 'bg-red-100 text-red-700' : 'bg-white text-gray-600 ring-1 ring-gray-200')}>{noQueue ? 'ไม่ใช้คิว ✓' : 'ไม่ใช้คิว'}</button></div></div></div><button disabled={!cart.length || busy} onClick={() => { setPaymentMethod('cash'); setCashReceived(''); setCheckoutOpen(true) }} className="w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">💳 ชำระเงิน</button></div>
        </aside>
      </div>}

      {tab === 'products' && <div className="mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">จัดการสินค้า</h2><p className="mt-1 text-sm text-gray-500">เพิ่ม แก้ไข และลบรายการสินค้า</p></div><button onClick={() => openProduct()} className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-blue-700">➕ เพิ่มสินค้า</button></div><Panel title={'รายการสินค้า (' + managedProducts.length + ')'} action={<input className={inputClass + ' w-56'} value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ค้นหาสินค้า..." />}>{managedProducts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3 text-right">ราคา</th><th className="px-4 py-3 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-gray-100">{managedProducts.map(product => <tr key={product.id} className="hover:bg-gray-50"><td className="px-4 py-3"><div className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className={'flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white ' + (product.color || 'bg-blue-500')}>{(product.name || '?').charAt(0)}</div>}<span className="font-semibold">{product.name}</span></div></td><td className="px-4 py-3 text-right font-semibold">{money(product.price)}</td><td className="px-4 py-3 text-right"><button onClick={() => openProduct(product)} className="mr-2 rounded-lg bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">✏️ แก้ไข</button><button onClick={() => deleteProduct(product)} className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-100">🗑️ ลบ</button></td></tr>)}</tbody></table></div> : <div className="py-12 text-center text-gray-500">ยังไม่มีสินค้า หรือไม่พบคำค้นหา</div>}</Panel></div>}

      {tab === 'summary' && <div className="mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">สรุปยอดขาย</h2><p className="mt-1 text-sm text-gray-500">รายงานยอดขายตามวันที่เลือก</p></div><div className="flex flex-wrap gap-2"><input aria-label="วันที่สรุปยอด" type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} className={inputClass + ' w-auto'} /><button onClick={exportCsv} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50">📥 Export CSV</button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['ยอดขายรวม',money(summary.revenue),'bg-blue-50 text-blue-700'],['เงินสด',money(summary.cash),'bg-emerald-50 text-emerald-700'],['พร้อมเพย์',money(summary.promptpay),'bg-violet-50 text-violet-700'],['จำนวนบิล / สินค้า',dailyBills.length + ' บิล · ' + summary.qty + ' ชิ้น','bg-amber-50 text-amber-700']].map(([label,value,color]) => <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className={'mt-3 text-xl font-extrabold ' + color.split(' ')[1]}>{value}</p></div>)}</div><div className="grid gap-5 lg:grid-cols-2"><Panel title="สินค้าขายดี">{summary.items.length ? <div className="space-y-4">{summary.items.map(item => <div key={item.name}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-medium">{item.name}</span><span className="text-gray-500">{item.qty} ชิ้น · {money(item.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500" style={{ width: (item.qty / Math.max(...summary.items.map(x => x.qty), 1) * 100) + '%' }} /></div></div>)}</div> : <p className="py-8 text-center text-sm text-gray-400">ไม่มีข้อมูลสินค้าในวันที่เลือก</p>}</Panel><Panel title={'ประวัติการขาย (' + dailyBills.length + ' บิล)'}>{dailyBills.length ? <div className="max-h-[420px] space-y-3 overflow-y-auto">{dailyBills.map(bill => <div key={bill.id} className="rounded-xl border border-gray-100 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{bill.queue && bill.queue !== '-' ? 'คิว ' + bill.queue : 'ไม่ใช้คิว'}</span><span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{bill.paymentMethod || 'เงินสด'}</span></div><p className="mt-1 text-xs text-gray-400">{bill.time || '-'}</p></div><button onClick={() => deleteBill(bill)} className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50">🗑️ ลบบิล</button></div><div className="my-3 space-y-1 border-l-2 border-gray-100 pl-3">{(bill.items || []).map((item, index) => <div key={item.name + index} className="flex justify-between gap-2 text-xs text-gray-600"><span>{item.qty} × {item.name}</span><span>{money(item.total)}</span></div>)}</div><div className="flex justify-between border-t border-gray-100 pt-3 text-sm"><span className="text-gray-500">ยอดสุทธิ</span><span className="font-bold text-blue-700">{money(bill.total)}</span></div></div>)}</div> : <p className="py-8 text-center text-sm text-gray-400">ไม่มีบิลในวันที่เลือก</p>}</Panel></div></div>}
    </main>

    <footer className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-2.5 text-xs text-gray-400"><span>Muslim KU POS · React + TypeScript + Vite</span><span>{products.length} สินค้า · {bills.length} บิลทั้งหมด</span></footer>

    {productModal && <Modal title={editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} onClose={() => setProductModal(false)}><form onSubmit={saveProduct} className="space-y-4"><Field label="ชื่อสินค้า"><input autoFocus required className={inputClass} value={productName} onChange={e => setProductName(e.target.value)} placeholder="เช่น ข้าวผัด" /></Field><Field label="ราคา (บาท)"><input required min="0" step="0.01" type="number" className={inputClass} value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="0.00" /></Field><Field label="รูปสินค้า (ไม่บังคับ)"><input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0])} className="w-full text-sm" /><span className="text-xs text-gray-400">รองรับรูปไม่เกิน 700 KB</span>{productImage && <img src={productImage} alt="ตัวอย่างสินค้า" className="mt-2 h-24 w-24 rounded-xl border object-cover" />}</Field><Field label="สีแสดงสินค้า"><div className="flex flex-wrap gap-2">{palette.map(color => <button type="button" key={color} aria-label={color} onClick={() => setProductColor(color)} className={'h-8 w-8 rounded-full ' + color + (productColor === color ? ' ring-4 ring-blue-200 ring-offset-2' : '')} />)}</div></Field><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setProductModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">ยกเลิก</button><button disabled={busy} type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}</button></div></form></Modal>}

    {checkoutOpen && <Modal title="ยืนยันการชำระเงิน" onClose={() => setCheckoutOpen(false)}><div className="space-y-5"><div className="rounded-2xl bg-blue-50 p-5 text-center"><p className="text-sm font-medium text-blue-700">ยอดชำระทั้งหมด</p><p className="mt-1 text-3xl font-extrabold text-blue-800">{money(cartTotal)}</p><p className="mt-2 text-xs text-blue-600">{cartQty} ชิ้น · {noQueue ? 'ไม่ใช้คิว' : 'คิว ' + (queue || '1')}</p></div><div className="grid grid-cols-2 gap-2"><button onClick={() => setPaymentMethod('cash')} className={'rounded-xl border p-3 font-semibold ' + (paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>เงินสด</button><button onClick={() => setPaymentMethod('promptpay')} className={'rounded-xl border p-3 font-semibold ' + (paymentMethod === 'promptpay' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>พร้อมเพย์</button></div>{paymentMethod === 'cash' ? <><Field label="รับเงินมา (บาท)"><input autoFocus type="number" min={cartTotal} step="0.01" className={inputClass} value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder={String(cartTotal)} /></Field><div className="flex justify-between rounded-lg bg-emerald-50 p-3 text-sm"><span className="text-emerald-800">เงินทอน</span><span className="font-bold text-emerald-800">{money(Math.max(0, (cashReceived.trim() ? Number(cashReceived) : cartTotal) - cartTotal))}</span></div></> : <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center"><div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-gray-50 text-5xl">📱</div><p className="mt-3 text-sm text-gray-500">ตรวจสอบการรับชำระผ่านพร้อมเพย์ก่อนยืนยัน</p><p className="mt-1 text-xs text-amber-600">หน้าจอนี้ยังไม่ได้เชื่อมระบบตรวจสอบการชำระเงินอัตโนมัติ</p></div>}<div className="flex gap-2"><button onClick={() => setCheckoutOpen(false)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold">ยกเลิก</button><button disabled={busy} onClick={checkout} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ยืนยันการชำระเงิน'}</button></div></div></Modal>}

    {error && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setError('')}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">!</div><h2 className="text-lg font-bold">แจ้งเตือน</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{error}</p><button autoFocus onClick={() => setError('')} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white">ตกลง</button></div></div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[80] rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">✅ {toast}</div>}
  </div>
}
