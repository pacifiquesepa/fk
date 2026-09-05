import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, Boxes, ClipboardList, DollarSign, Edit3, Package, Plus, Printer, Search, Trash2, TrendingDown, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import api from '../lib/api';

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`;
const managerRoles = ['admin', 'dos', 'accountant'];

export default function InventoryPage({ user, t, onBack }) {
    const canManage = managerRoles.includes(user?.role);
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [productModal, setProductModal] = useState(null);
    const [stockModal, setStockModal] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const [itemsResponse, transactionsResponse] = await Promise.all([api.get('/inventory'), api.get('/inventory/transactions')]);
            setProducts(itemsResponse.data.items || []);
            setTransactions(transactionsResponse.data.transactions || []);
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to load inventory records.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user?.role]);
    const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
    const filteredProducts = useMemo(() => products.filter((product) => (!category || product.category === category) && (!search.trim() || `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()))), [products, search, category]);
    const stats = useMemo(() => ({ totalProducts: products.length, totalStock: products.reduce((sum, product) => sum + Number(product.quantity || 0), 0), lowStock: products.filter((product) => Number(product.quantity || 0) <= Number(product.reorderLevel || 0)).length, stockValue: products.reduce((sum, product) => sum + Number(product.unitCost || 0) * Number(product.quantity || 0), 0) }), [products]);
    const saveProduct = async (event) => { event.preventDefault(); setSaving(true); const data = Object.fromEntries(new FormData(event.currentTarget)); const payload = { name: data.name, category: data.category, quantity: Number(data.quantity), reorderLevel: Number(data.reorderLevel), unitCost: Number(data.unitCost), location: data.location }; try { await (productModal && productModal !== 'new' ? api.patch(`/inventory/${productModal.id}`, payload) : api.post('/inventory', payload)); setProductModal(null); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save product.'); } finally { setSaving(false); } };
    const saveMovement = async (event) => { event.preventDefault(); setSaving(true); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await api.post('/inventory/movements', { itemId: Number(data.itemId), type: data.type, quantity: Number(data.quantity), note: data.note }); setStockModal(null); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save stock movement.'); } finally { setSaving(false); } };
    const deleteProduct = async (product) => { if (!window.confirm(`Delete "${product.name}"?`)) return; try { await api.delete(`/inventory/${product.id}`); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to delete product.'); } };

    return <div className="space-y-7">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />{t.overview}</button>
        <section className="rounded-3xl bg-[#0f172a] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/20 text-blue-300"><Boxes size={28} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Inventory management</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Inventory dashboard</h1><p className="mt-2 text-sm text-slate-300">Manage products, stock levels and movement history.</p></div></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold"><Printer size={15} /> Print</button>{canManage && <button onClick={() => setProductModal('new')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold hover:bg-blue-500"><Plus size={15} /> Add product</button>}</div></div></section>
        {error && <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
        <div className="flex gap-2 border-b border-slate-200 pb-2"><button onClick={() => setActiveSection('dashboard')} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${activeSection === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><BarChart3 className="mr-2 inline" size={15} />Dashboard</button><button onClick={() => setActiveSection('products')} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${activeSection === 'products' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Package className="mr-2 inline" size={15} />Products</button><button onClick={() => setActiveSection('transactions')} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${activeSection === 'transactions' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><ClipboardList className="mr-2 inline" size={15} />Transactions</button></div>
        {activeSection === 'dashboard' && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Total products" value={stats.totalProducts} icon={<Package size={19} />} /><Metric title="Total stock" value={stats.totalStock} icon={<Boxes size={19} />} /><Metric title="Low stock" value={stats.lowStock} icon={<AlertTriangle size={19} />} /><Metric title="Stock value" value={money(stats.stockValue)} icon={<DollarSign size={19} />} /></section><section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]"><Panel title="Daily usage this month (stock out)" icon={<TrendingDown size={18} />}><DailyUsageChart transactions={transactions} products={products} /></Panel><Panel title="Low stock products" icon={<TrendingDown size={18} />}>{products.filter((item) => Number(item.quantity) <= Number(item.reorderLevel)).map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 text-xs last:border-0"><span className="font-bold text-slate-700">{item.name}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">{item.quantity} left</span></div>)}{!stats.lowStock && <Empty text="All stock levels are good." />}</Panel></section><Panel title="Recent transactions" icon={<ClipboardList size={18} />}>{transactions.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 text-xs last:border-0"><div><b className="text-slate-700">{item.productName}</b><p className="mt-1 text-[10px] text-slate-400">{item.createdAt || item.movedAt}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.type === 'in' ? 'Stock in' : 'Stock out'} · {item.quantity}</span></div>)}{!transactions.length && <Empty text="No transactions yet." />}</Panel></>}
        {activeSection === 'products' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-xs outline-none focus:border-blue-500" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-xs"><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><DataTable columns={[{ key: 'id', label: 'ID', render: (row) => `#${row.id}` }, { key: 'name', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'unitCost', label: 'Price', render: (row) => money(row.unitCost) }, { key: 'quantity', label: 'Stock' }, { key: 'monthlyAdded', label: 'Added this month' }, { key: 'status', label: 'Status', render: (row) => <StockBadge product={row} /> }, { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1">{canManage && <><button title="Stock in" onClick={() => setStockModal({ itemId: row.id, type: 'in' })} className="rounded-md bg-emerald-100 p-2 text-emerald-700">+</button><button title="Stock out" onClick={() => setStockModal({ itemId: row.id, type: 'out' })} className="rounded-md bg-amber-100 p-2 text-amber-700">-</button><button title="Edit" onClick={() => setProductModal(row)} className="rounded-md bg-blue-100 p-2 text-blue-700"><Edit3 size={13} /></button><button title="Delete" onClick={() => deleteProduct(row)} className="rounded-md bg-rose-100 p-2 text-rose-700"><Trash2 size={13} /></button></>}</div> }]} rows={filteredProducts} emptyLabel="No products found." /></section>}
        {activeSection === 'transactions' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-base font-bold text-slate-800">Stock movement history</h2><div className="flex gap-2">{canManage && <button onClick={() => setStockModal({ itemId: '', type: 'out' })} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> New transaction</button>}<button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Printer size={14} /> Print</button></div></div><DataTable columns={[{ key: 'createdAt', label: 'Date' }, { key: 'productName', label: 'Product' }, { key: 'type', label: 'Type', render: (row) => row.type === 'in' ? 'Stock in' : 'Stock out' }, { key: 'quantity', label: 'Removed/added' }, { key: 'remainingStock', label: 'Remaining' }, { key: 'stockStatus', label: 'Status', render: (row) => <StockStatus status={row.stockStatus} /> }, { key: 'note', label: 'Description' }]} rows={transactions} emptyLabel="No transactions yet." /></section>}
        {productModal && <ProductModal product={productModal === 'new' ? null : productModal} saving={saving} onClose={() => setProductModal(null)} onSubmit={saveProduct} />}
        {stockModal && <StockModal item={products.find((product) => product.id === stockModal.itemId)} products={products} type={stockModal.type} saving={saving} onClose={() => setStockModal(null)} onSubmit={saveMovement} />}
    </div>;
}

function Metric({ title, value, icon }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p><p className="mt-2 text-2xl font-black text-slate-800">{value}</p></div>; }
function Panel({ title, icon, children }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 text-blue-600">{icon}<h2 className="font-display text-base font-bold text-slate-800">{title}</h2></div>{children}</div>; }
function Empty({ text }) { return <p className="py-8 text-center text-xs text-slate-400">{text}</p>; }
function DailyUsageChart({ transactions, products }) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const productMap = new Map((products || []).map((product) => [Number(product.id), product]));
    const itemUsage = new Map();
    const monthlyAdded = new Map();
    for (const product of products || []) {
        monthlyAdded.set(Number(product.id), Number(product.monthlyAdded || 0));
    }
    for (const item of transactions || []) {
        if (item.type !== 'out' || String(item.createdAt || '').slice(0, 7) !== currentMonth) continue;
        const itemId = Number(item.itemId ?? item.productId ?? item.id);
        if (!itemUsage.has(itemId)) {
            const product = productMap.get(itemId) || { name: item.productName || 'Unknown item' };
            itemUsage.set(itemId, { name: product.name, totalUsed: 0, daily: {} });
        }
        const usage = itemUsage.get(itemId);
        const day = String(item.createdAt).slice(0, 10);
        if (!usage.daily[day]) usage.daily[day] = { quantity: 0, count: 0 };
        usage.daily[day].quantity += Number(item.quantity || 0);
        usage.daily[day].count += 1;
        usage.totalUsed += Number(item.quantity || 0);
    }

    const rows = [...itemUsage.entries()].map(([itemId, usage]) => ({
        id: itemId,
        name: usage.name,
        totalUsed: usage.totalUsed,
        monthlyAdded: monthlyAdded.get(itemId) || 0,
        daily: Object.entries(usage.daily).sort(([first], [second]) => first.localeCompare(second)),
    })).sort((first, second) => second.totalUsed - first.totalUsed || first.name.localeCompare(second.name));

    if (!rows.length) return <Empty text="No stock-out usage recorded this month." />;
    const maxQuantity = Math.max(...rows.flatMap((row) => row.daily.map(([, value]) => value.quantity)), 1);

    return <div className="space-y-4">{rows.map((row) => {
        const dateBars = Array.from({ length: monthDays }, (_, idx) => {
            const dayNumber = idx + 1;
            const dayKey = `${currentMonth}-${String(dayNumber).padStart(2, '0')}`;
            const value = row.daily.find(([date]) => date === dayKey)?.[1] || { quantity: 0, count: 0 };
            const height = value.quantity > 0 ? Math.max((value.quantity / maxQuantity) * 72, 10) : 0;
            return { dayNumber, dayKey, value, height };
        });
        return <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-slate-700">{row.name}</p><p className="text-[9px] text-slate-400">Added this month: {row.monthlyAdded}</p></div><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">Used: {row.totalUsed}</span></div>
            <div className="flex items-end gap-1 overflow-x-auto pb-1">
                {dateBars.map(({ dayNumber, dayKey, value, height }) => <div key={dayKey} className="flex min-w-[18px] flex-1 flex-col items-center justify-end gap-1" title={`${dayKey}: ${value.count} stock-out${value.count === 1 ? '' : 's'} · ${value.quantity} used`}>
                    <span className="text-[8px] font-bold text-slate-500">{value.count || ''}</span>
                    <div className="w-full rounded-t-md bg-blue-600 transition-all" style={{ height: `${height}px`, opacity: value.quantity > 0 ? 1 : 0.18 }} />
                    <span className="text-[8px] font-semibold text-slate-500">{dayNumber}</span>
                </div>)}
            </div>
        </div>;
    })}</div>;
}
function StockStatus({ status }) { const labels = { in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock' }; const styles = { in_stock: 'bg-emerald-100 text-emerald-700', low_stock: 'bg-amber-100 text-amber-700', out_of_stock: 'bg-rose-100 text-rose-700' }; return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles[status] || styles.in_stock}`}>{labels[status] || 'In stock'}</span>; }
function StockBadge({ product }) { const quantity = Number(product.quantity || 0); const reorder = Number(product.reorderLevel || 0); const label = quantity === 0 ? 'Out of stock' : quantity <= reorder ? 'Low stock' : 'In stock'; const style = quantity === 0 ? 'bg-rose-100 text-rose-700' : quantity <= reorder ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'; return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${style}`}>{label}</span>; }
function ProductModal({ product, saving, onClose, onSubmit }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"><form onSubmit={onSubmit} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-slate-800">{product ? 'Edit product' : 'Add product'}</h2><button type="button" onClick={onClose}><X className="text-slate-400" size={19} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input name="name" required defaultValue={product?.name || ''} placeholder="Product name" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /><input name="category" required defaultValue={product?.category || ''} placeholder="Category" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /><input name="unitCost" required type="number" min="0" step="0.01" defaultValue={product?.unitCost || 0} placeholder="Price" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /><input name="quantity" required type="number" min="0" defaultValue={product?.quantity || 0} placeholder="Stock quantity" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /><input name="reorderLevel" required type="number" min="0" defaultValue={product?.reorderLevel || 0} placeholder="Minimum stock" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /><input name="location" defaultValue={product?.location || ''} placeholder="Location" className="rounded-xl border border-slate-200 px-3 py-3 text-xs" /></div><button disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white">{saving ? 'Saving...' : 'Save product'}</button></form></div>; }
function StockModal({ item, products, type, saving, onClose, onSubmit }) { const [selectedId, setSelectedId] = useState(item?.id || ''); const selected = products.find((product) => product.id === Number(selectedId)) || item; const remaining = selected ? Number(selected.quantity || 0) : 0; const status = remaining === 0 ? 'out_of_stock' : remaining <= Number(selected?.reorderLevel || 0) ? 'low_stock' : 'in_stock'; return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"><form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-slate-800">{type === 'in' ? 'Stock in' : 'Stock out'}</h2><button type="button" onClick={onClose}><X className="text-slate-400" size={19} /></button></div><label className="mt-5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Product</label><select name="itemId" required value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.category}</option>)}</select><input type="hidden" name="type" value={type} /><div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-xs"><span className="text-slate-500">Current remaining: <b className="text-slate-700">{remaining}</b></span><StockStatus status={status} /></div><input name="quantity" required min="1" max={type === 'out' ? remaining || undefined : undefined} type="number" placeholder={type === 'out' ? 'Quantity removed' : 'Quantity added'} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs" /><textarea name="note" placeholder="Description / reason" className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs" /><button disabled={saving || !selectedId} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save movement'}</button></form></div>; }
