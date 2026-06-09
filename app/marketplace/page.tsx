'use client'
import { useMarketplaceLogic } from './logic';

// Konstanta di luar fungsi komponen
const CATEGORY_ICONS: Record<string, string> = {
  Kardus: '📦', Plastik: '🥤', Kertas: '📰',
  Logam: '🔧', Kaca: '🫙', Lainnya: '♻️',
};
const CATEGORIES = ['Semua', 'Kardus', 'Plastik', 'Kertas', 'Logam', 'Kaca', 'Lainnya'];
const FORM_FIELDS = [
  { key: 'product_name', label: 'Nama Sampah *', placeholder: 'Contoh: Kardus Bekas...', type: 'text' },
  { key: 'seller_name', label: 'Nama Penjual *', placeholder: 'Nama lengkap kamu', type: 'text' },
  { key: 'seller_phone', label: 'No. WhatsApp', placeholder: '08xxxxxxxxxx', type: 'tel' },
  { key: 'product_price', label: 'Harga per kg (Rp) *', placeholder: 'Contoh: 2000', type: 'number' },
  { key: 'weight_kg', label: 'Estimasi Berat (kg)', placeholder: 'Contoh: 10', type: 'number' },
  { key: 'product_stock', label: 'Stok (kg)', placeholder: 'Contoh: 50', type: 'number' },
  { key: 'location_area', label: 'Area Lokasi', placeholder: 'Contoh: Jakarta Selatan', type: 'text' },
];

export default function MarketplacePage() {
  const {
    tab,
    setTab,
    loading,
    categoryFilter,
    setCategoryFilter,
    filteredProducts,
    form,
    setForm,
    handleSubmitJual,
    submitting,
    submitSuccess,
    setSubmitSuccess,
    orderModal,
    setOrderModal,
    selectedProduct,
    handleOrder,
    confirmOrder,
    ordering,
    orderSuccess
  } =  useMarketplaceLogic();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-green-600 px-5 pt-14 pb-5 rounded-b-3xl flex-shrink-0">
        <h1 className="text-white text-xl font-bold">Marketplace Sampah</h1>
        <p className="text-teal-100 text-sm mt-0.5">Jual & beli sampah daur ulang, driver kami yang antar 🚛</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 bg-white/20 rounded-xl p-1">
          <button onClick={() => setTab('beli')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === 'beli' ? 'bg-white text-teal-700' : 'text-white'}`}>
            🛍️ Beli Sampah
          </button>
          <button onClick={() => setTab('jual')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === 'jual' ? 'bg-white text-teal-700' : 'text-white'}`}>
            📦 Jual Sampah
          </button>
        </div>
      </div>

      {/* ── BELI TAB ── */}
      {tab === 'beli' && (
        <div className="px-4 mt-4 pb-6 flex flex-col gap-3">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border pressable
                  ${categoryFilter === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                {cat !== 'Semua' && CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Memuat produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📭</p>
              <p className="text-gray-600 font-semibold">Belum ada produk</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Jadilah yang pertama menjual!</p>
              <button onClick={() => setTab('jual')}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm pressable">
                + Jual Sampahmu
              </button>
            </div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.recycle_product_id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {CATEGORY_ICONS[p.category] || '♻️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{p.product_name}</p>
                    <span className="inline-block text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full mt-0.5">
                      {p.category}
                    </span>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-teal-600">
                      Rp {p.product_price.toLocaleString('id')}
                    </p>
                    <p className="text-xs text-gray-400">per kg</p>
                  </div>
                </div>

                <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
                  <span>👤 {p.seller_name}</span>
                  <span>·</span>
                  <span>⚖️ {p.weight_kg} kg</span>
                  <span>·</span>
                  <span>📍 {p.location_area}</span>
                  <span>·</span>
                  <span>📦 Stok: {p.product_stock} kg</span>
                </div>

                <div className="flex gap-2">
                  <a href={`tel:${p.seller_phone}`}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-semibold text-center pressable">
                    📞 Hubungi
                  </a>
                  <button onClick={() => handleOrder(p)}
                    className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-xs font-semibold pressable">
                    🚛 Pesan & Antar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── JUAL TAB ── */}
      {tab === 'jual' && (
        <div className="px-4 mt-4 pb-6">
          {submitSuccess ? (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🎉</p>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Berhasil Diposting!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Sampahmu sudah tampil di marketplace. Pembeli bisa langsung menghubungi kamu.
              </p>
              <button onClick={() => { setSubmitSuccess(false); setTab('beli') }}
                className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold pressable">
                Lihat Marketplace
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Info banner */}
              <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
                <p className="text-sm font-semibold text-teal-800 mb-1">💡 Cara kerja</p>
                <p className="text-xs text-teal-600">
                  Posting sampah → pembeli order → driver TrashIN jemput dari kamu → antar ke pembeli.
                  Kamu dapat uang, lingkungan bersih!
                </p>
              </div>

              {/* Form fields */}
              {FORM_FIELDS.map(field => (
                <div key={field.key}>
                  <p className="text-sm font-semibold text-gray-700 mb-1">{field.label}</p>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
              ))}

              {/* Category picker */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Kategori</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.filter(c => c !== 'Semua').map(cat => (
                    <button key={cat} onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 pressable
                        ${form.category === cat
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600'}`}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Deskripsi</p>
                <textarea
                  placeholder="Kondisi sampah, cara packing, dll..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-teal-400 focus:outline-none resize-none"
                />
              </div>

              <button onClick={handleSubmitJual} disabled={submitting}
                className="w-full bg-teal-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-teal-200 pressable">
                {submitting ? '⏳ Memposting...' : '✅ Posting Sampah Sekarang'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Modal */}
      {orderModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => { if (!ordering) setOrderModal(false) }}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div className="text-center py-4">
                <p className="text-5xl mb-3">🎉</p>
                <h3 className="font-bold text-gray-800 text-lg mb-2">Pesanan Berhasil!</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Driver TrashIN akan segera menjemput sampah dari {selectedProduct.seller_name} dan mengantarkan ke lokasimu.
                </p>
                <button onClick={() => setOrderModal(false)}
                  className="w-full bg-teal-600 text-white py-3.5 rounded-2xl font-bold pressable">
                  Tutup
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-800 text-lg mb-1">Konfirmasi Pesanan</h3>
                <p className="text-gray-400 text-sm mb-5">
                  Driver akan menjemput dari penjual dan mengantarkan ke lokasimu
                </p>
                <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex flex-col gap-2">
                  {[
                    { label: 'Produk',         value: selectedProduct.product_name },
                    { label: 'Kategori',        value: selectedProduct.category },
                    { label: 'Penjual',         value: selectedProduct.seller_name },
                    { label: 'Lokasi Penjual',  value: selectedProduct.location_area },
                    { label: 'Berat',           value: `${selectedProduct.weight_kg} kg` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-200 mt-1">
                    <span className="text-sm font-bold">Harga</span>
                    <span className="text-sm font-bold text-teal-600">
                      Rp {selectedProduct.product_price.toLocaleString('id')}/kg
                    </span>
                  </div>
                </div>
                <button onClick={confirmOrder} disabled={ordering}
                  className="w-full bg-teal-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold pressable mb-2">
                  {ordering ? '⏳ Memproses...' : '✅ Konfirmasi Pesanan'}
                </button>
                <button onClick={() => setOrderModal(false)}
                  className="w-full text-gray-400 text-sm py-2">
                  Batal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}