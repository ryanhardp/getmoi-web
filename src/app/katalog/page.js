"use client";
import { useState, useEffect } from 'react';

export default function KatalogPublik() {
  const [katalog, setKatalog] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchKatalog = async () => {
      try {
        const res = await fetch('/api/gudang');
        const respon = await res.json();
        
        if (respon.success) {
          // 🚀 FILTER RAHASIA: Cuma tampilin baju yang stoknya > 0 dan BUKAN Packaging
          const bajuReady = respon.data.filter(item => {
            const isPack = String(item.kodeItem).startsWith('P') || item.kategori === 'Packaging';
            const isHabis = Number(item.stok) === 0;
            return !isPack && !isHabis;
          });
          setKatalog(bajuReady);
        }
      } catch (error) {
        console.error("Gagal memuat katalog", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchKatalog();
  }, []);

  // Fitur Pencarian Cepat buat Customer
  const filteredKatalog = katalog.filter(item => 
    (item.kodeItem && item.kodeItem.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.namaBarang && item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-pink-50/30 font-sans text-gray-800 pb-12">
      {/* HEADER KHUSUS CUSTOMER */}
      <div className="bg-white border-b border-pink-100 shadow-sm sticky top-0 z-10 px-6 py-4">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center">
          <h1 className="text-2xl font-black text-gray-900 tracking-wider uppercase mb-1">Getmoi Thrifting 🌸</h1>
          <p className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
            Real-time Ready Stock
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        
        {/* KOTAK PENCARIAN */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cari Kode / Nama Baju</label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Contoh: A16 atau Blouse..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
        </div>

        {/* DAFTAR BARANG READY */}
        <div className="space-y-3">
          {!isLoaded ? (
            <div className="text-center p-10">
              <p className="text-pink-500 font-bold animate-pulse">⏳ Mengecek rak gudang Getmoi...</p>
            </div>
          ) : filteredKatalog.length > 0 ? (
            filteredKatalog.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-pink-300 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
                    {item.kodeItem}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{item.namaBarang}</h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Tersedia: {item.stok} pcs</p>
                  </div>
                </div>
                <div>
                  <span className="bg-green-100 text-green-600 border border-green-200 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                    Ready
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-bold">Yah, barangnya udah Sold Out / Nggak ketemu 😭</p>
              <p className="text-xs text-gray-400 mt-2">Coba cari kode barang yang lain ya!</p>
            </div>
          )}
        </div>

        {/* FOOTER INFO */}
        <div className="mt-10 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Ketemu barang inceranmu? Langsung chat admin buat order!
          </p>
        </div>

      </div>
    </main>
  );
}