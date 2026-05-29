"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Operasional() {
  const [keterangan, setKeterangan] = useState('');
  const [kategori, setKategori] = useState('Lain-lain');
  const [nominal, setNominal] = useState('');
  const [loading, setLoading] = useState(false);
  const [daftarOperasional, setDaftarOperasional] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 🚀 OTOMATIS SEDOT DATA DARI AWAN PAS DIBUKA
  const loadDataDariAwan = async () => {
    try {
      const res = await fetch('/api/operasional');
      const respon = await res.json();
      if (respon.success) {
        setDaftarOperasional(respon.data);
      }
    } catch (error) {
      console.error("Gagal narik operasional:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => { loadDataDariAwan(); }, []);

  // 🚀 NEMBAK LANGSUNG KE GOOGLE SHEETS
  const handleSimpan = async () => {
    if (!keterangan || !nominal) { alert('Isi dulu keterangan sama nominalnya bosku!'); return; }
    setLoading(true);
    
    const payload = {
      tanggal: new Date().toLocaleDateString('sv-SE') + ' ' + new Date().toLocaleTimeString('sv-SE', {hour: '2-digit', minute:'2-digit'}),
      keterangan,
      nominal: Number(nominal)
    };

    try {
      const res = await fetch('/api/operasional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const respon = await res.json();
      
      if(respon.success){
        alert("✅ Berhasil dicatat ke Google Sheets!");
        setKeterangan(''); setNominal('');
        loadDataDariAwan(); // Auto-refresh tabel
      } else {
        alert("❌ Gagal simpan: " + respon.error);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <main className="p-8 font-sans text-gray-800 max-w-7xl mx-auto">
      <div className="space-y-8">
        <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-pink-100">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-pink-50 rounded-xl shadow-sm hover:bg-pink-100 text-pink-600 transition font-medium text-sm">&larr; Kembali</Link>
            <h1 className="text-xl font-extrabold text-gray-900">Catat Operasional 💸</h1>
          </div>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
            ☁️ Cloud Sync Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-pink-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-pink-50 pb-2">➕ Tambah Pengeluaran</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Keterangan</label>
                <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" placeholder="Cth: Beli bensin vario..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nominal (Rp)</label>
                <input type="number" value={nominal} onChange={e => setNominal(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" placeholder="Cth: 25000" />
              </div>
              <button onClick={handleSimpan} disabled={loading} className="w-full mt-2 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-all shadow-md shadow-pink-500/30 disabled:opacity-50">
                {loading ? 'Mencatat ke Awan...' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">📋 Riwayat Operasional</h2>
              {!isLoaded && <span className="text-xs font-bold text-blue-500 animate-pulse">⏳ Sinkronisasi data...</span>}
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-pink-50/90 text-gray-500 text-[10px] uppercase tracking-wider border-b border-pink-100 backdrop-blur-sm">
                    <th className="p-4 rounded-tl-xl font-bold">Tanggal</th>
                    <th className="p-4 font-bold">Keterangan</th>
                    <th className="p-4 font-bold">Nominal</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                  {daftarOperasional.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-xs font-medium text-gray-500">{item.tanggal}</td>
                      <td className="p-4 font-bold text-gray-800">{item.keterangan}</td>
                      <td className="p-4 font-bold text-red-500">- Rp {(item.nominal || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {daftarOperasional.length === 0 && isLoaded && (
                    <tr><td colSpan="3" className="p-8 text-center text-gray-400 font-bold italic">Belum ada pengeluaran operasional.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}