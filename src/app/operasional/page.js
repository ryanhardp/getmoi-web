"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Operasional() {
  const [keterangan, setKeterangan] = useState('');
  const [kategori, setKategori] = useState('Lain-lain');
  const [nominal, setNominal] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTarik, setLoadingTarik] = useState(false);
  const [daftarOperasional, setDaftarOperasional] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('db_operasional');
    if (saved) {
      setDaftarOperasional(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  const handleSimpan = async () => {
    if (!keterangan || !nominal) { alert('Isi dulu keterangan sama nominalnya bosku!'); return; }
    setLoading(true);
    const tanggal = new Date().toLocaleDateString('id-ID'); 
    const nominalAngka = Number(nominal);

    const itemBaru = { id: Date.now(), tanggal, keterangan, kategori, nominal: nominalAngka };
    const dataTerbaru = [itemBaru, ...daftarOperasional];
    setDaftarOperasional(dataTerbaru);
    localStorage.setItem('db_operasional', JSON.stringify(dataTerbaru));

    // Nembak API dimatikan sementara nunggu sinkron lokal beres
    setKeterangan(''); setNominal('');
    setLoading(false);
  };

  const hapusItem = (id) => {
    const sisa = daftarOperasional.filter(item => item.id !== id);
    setDaftarOperasional(sisa);
    localStorage.setItem('db_operasional', JSON.stringify(sisa));
  };

  // 🚀 FUNGSI SAKTI NYEDOT DATA OPERASIONAL 🚀
  const handleTarikData = async () => {
    const gas = confirm("⚠️ Ini bakal nyedot data dari tab 'Operasional' Google Sheets lu. Gas?");
    if (!gas) return;

    setLoadingTarik(true);
    try {
      const res = await fetch('/api/operasional');
      const respon = await res.json();
      
      if (respon.success) {
        // Gabungin data lama di web sama data dari Sheets (biar yang udah dicatat manual ga ilang)
        // Terus di-reverse biar data terbaru (dari bawah excel) muncul di atas
        const dataSedotan = respon.data.reverse();
        setDaftarOperasional(dataSedotan);
        localStorage.setItem('db_operasional', JSON.stringify(dataSedotan));
        alert(`✅ Mantap! Ketarik ${respon.data.length} data operasional.`);
      } else {
        alert("❌ Gagal narik: " + respon.error);
      }
    } catch (error) {
      alert("❌ Error sistem: " + error.message);
    }
    setLoadingTarik(false);
  };

  if (!isLoaded) return null;

  return (
    <main className="p-8 font-sans text-gray-800 max-w-7xl mx-auto">
      <div className="space-y-8">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-pink-100">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-pink-50 rounded-xl shadow-sm hover:bg-pink-100 text-pink-600 transition font-medium text-sm">
              &larr; Kembali
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900">Catat Operasional 💸</h1>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
            ● Mode Lokal Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* KIRI: Form Input */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-pink-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-pink-50 pb-2">➕ Tambah Pengeluaran</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Keterangan</label>
                <input 
                  type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} 
                  className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" 
                  placeholder="Cth: Beli bensin vario..." 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Kategori</label>
                <select 
                  value={kategori} onChange={e => setKategori(e.target.value)} 
                  className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 font-medium transition"
                >
                  <option value="Alat & Perlengkapan">Alat & Perlengkapan</option>
                  <option value="Transportasi">Transportasi</option>
                  <option value="Kebersihan">Kebersihan</option>
                  <option value="Konsumsi">Konsumsi</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nominal (Rp)</label>
                <input 
                  type="number" value={nominal} onChange={e => setNominal(e.target.value)} 
                  className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" 
                  placeholder="Cth: 25000" 
                />
              </div>

              <button 
                onClick={handleSimpan} disabled={loading} 
                className="w-full mt-2 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-all shadow-md shadow-pink-500/30 disabled:opacity-50"
              >
                {loading ? 'Mencatat...' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </div>

          {/* KANAN: Tabel Riwayat */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
            
            {/* TOMBOL TARIK DATA DI SINI */}
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">📋 Riwayat Operasional</h2>
              <button 
                onClick={handleTarikData} 
                disabled={loadingTarik}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 hover:scale-105 transition-all text-xs shadow-sm flex items-center gap-2"
              >
                {loadingTarik ? '⏳ Menyedot...' : '☁️ Tarik Data Sheets'}
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-pink-50/90 text-gray-500 text-[10px] uppercase tracking-wider border-b border-pink-100 backdrop-blur-sm">
                    <th className="p-4 rounded-tl-xl font-bold">Tanggal</th>
                    <th className="p-4 font-bold">Keterangan</th>
                    <th className="p-4 font-bold">Kategori</th>
                    <th className="p-4 font-bold">Nominal</th>
                    <th className="p-4 rounded-tr-xl font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                  {daftarOperasional.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-xs font-medium text-gray-500">{item.tanggal}</td>
                      <td className="p-4 font-bold text-gray-800">{item.keterangan}</td>
                      <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">{item.kategori}</span></td>
                      <td className="p-4 font-bold text-red-500">- Rp {(item.nominal || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => hapusItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus">🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {daftarOperasional.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400 font-bold italic">Belum ada pengeluaran operasional yang dicatat.</td>
                    </tr>
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