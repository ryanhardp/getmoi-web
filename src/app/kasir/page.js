"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Kasir() {
  const [dbBarang, setDbBarang] = useState([]);
  const [riwayatPenjualan, setRiwayatPenjualan] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTarik, setLoadingTarik] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🚀 STATE KHUSUS BUAT NAMPILIN NOTA THERMAL
  const [notaAktif, setNotaAktif] = useState(null);

  // 🛠️ HELPER: Obat Penawar Tanggal Aneh dari Google Sheets
  const formatTanggal = (tglStr) => {
    if (!tglStr) return "";
    // Kalau yang ditarik malah angka serial Excel (misal 46172.xxx)
    if (!isNaN(Number(tglStr)) && Number(tglStr) > 40000) {
      const excelDate = Number(tglStr);
      // Konversi serial Excel ke Date JavaScript
      const dateObj = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return dateObj.toLocaleDateString('sv-SE') + ' ' + dateObj.toLocaleTimeString('sv-SE', {hour: '2-digit', minute:'2-digit'});
    }
    return tglStr;
  };

  const loadDataCloud = async () => {
    try {
      const [resGudang, resJual] = await Promise.all([
        fetch('/api/gudang').then(r => r.json()),
        fetch('/api/kasir').then(r => r.json())
      ]);
      if(resGudang.success) setDbBarang(resGudang.data.filter(b => b.stok > 0)); 
      if(resJual.success) {
        // Obatin semua tanggal yang aneh sebelum disimpen ke State
        const dataJualSehat = resJual.data.map(trx => ({
          ...trx,
          tanggal: formatTanggal(trx.tanggal)
        }));
        setRiwayatPenjualan(dataJualSehat);
      }
    } catch (error) {
      console.error("Gagal narik data:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadDataCloud();
  }, []);

  const [barangPilihan, setBarangPilihan] = useState("");
  const [keranjang, setKeranjang] = useState([]);
  const [hargaJual, setHargaJual] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("Transfer BCA"); 

  const tambahKeKeranjang = () => {
    if (!barangPilihan) return;
    const item = dbBarang.find(b => b.kodeItem === barangPilihan);
    if (item) {
      setKeranjang([...keranjang, item]);
      setBarangPilihan(""); 
    }
  };

  const hapusDariKeranjang = (indexHapus) => {
    setKeranjang(keranjang.filter((_, i) => i !== indexHapus));
  };

  const totalModal = keranjang.reduce((total, item) => total + (item.hargaModal || 0), 0);
  const potensiProfit = (Number(hargaJual) || 0) - totalModal;

  const handleSimpanTransaksi = async () => {
    if (keranjang.length === 0) return alert("❌ Keranjang kosong bro!");
    if (!hargaJual) return alert("❌ Isi Harga Jual Akhir dulu bro!");

    setIsSaving(true);
    const gabunganKode = keranjang.map(i => i.kodeItem).join('+');
    const gabunganNama = keranjang.map(i => `1x ${i.namaBarang}`).join(' + ');
    
    const payload = {
      tanggal: new Date().toLocaleDateString('sv-SE') + ' ' + new Date().toLocaleTimeString('sv-SE', {hour: '2-digit', minute:'2-digit'}), 
      kodeItem: gabunganKode,
      namaBarang: `${gabunganNama} [${metodeBayar}]`, 
      hargaModal: totalModal,
      hargaJual: Number(hargaJual),
      qty: keranjang.length, 
      profit: potensiProfit,
      profitPersen: totalModal > 0 ? `${((potensiProfit/totalModal)*100).toFixed(1)}%` : "0%",
      keranjang: keranjang 
    };

    try {
      const res = await fetch('/api/kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const respon = await res.json();
      
      if(respon.success) {
        alert(`✅ Transaksi Berhasil!\nStok otomatis terpotong di Gudang!\nProfit: Rp ${potensiProfit.toLocaleString('id-ID')}`);
        setKeranjang([]); setHargaJual(""); setMetodeBayar("Transfer BCA");
        
        await loadDataCloud(); 

        // 🚀 Hitung ID Ref Transaksi Baru
        const urutanBaru = riwayatPenjualan.length + 1;
        setNotaAktif({ ...payload, refId: urutanBaru });
      } else {
        alert("❌ Gagal simpan ke Sheets: " + respon.error);
      }
    } catch (error) {
      alert("❌ Error sistem: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTarikData = async () => {
    setLoadingTarik(true);
    await loadDataCloud();
    alert("✅ Berhasil narik riwayat penjualan terbaru!");
    setLoadingTarik(false);
  };

  const handlePrintNota = () => {
    window.print();
  };

  // Logika buat ngeracik daftar item belanjaan ke bawah di nota
  const renderItemNota = (nota) => {
    if (!nota) return null;
    let items = [];

    if (nota.keranjang && Array.isArray(nota.keranjang)) {
      // Data dari transaksi yang baru dibikin detik ini
      items = nota.keranjang.map(k => `${k.namaBarang} (Modal: Rp ${(k.hargaModal || 0).toLocaleString('id-ID')})`);
    } else {
      // Data dari riwayat tabel (kita pecah teks-nya)
      let rawText = nota.namaBarang || "";
      rawText = rawText.replace(/\[.*?\]/g, ""); // Umpetin teks "[Transfer BCA]" dari rincian item
      items = rawText.split('+').map(i => i.trim()).filter(i => i !== "");
    }

    return items.map((item, idx) => (
      <p key={idx} className="pl-2 mb-1 text-[10px]">- {item}</p>
    ));
  };

  const barangBelumDipilih = dbBarang.filter(b => !keranjang.some(k => k.kodeItem === b.kodeItem)); 

  if (!isLoaded) return null;

  return (
    <>
      {/* 🚀 MODAL NOTA THERMAL (UKURAN 58mm) 🚀 */}
      {notaAktif && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex justify-center py-10 print:absolute print:inset-0 print:block print:bg-white print:py-0 print:overflow-visible">
          
          <div className="relative w-full max-w-sm flex flex-col items-center">
            {/* Tombol Kontrol */}
            <div className="w-full flex justify-between bg-white p-4 rounded-xl mb-4 shadow-lg print:hidden">
              <button onClick={() => setNotaAktif(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-sm transition">Tutup</button>
              <button onClick={handlePrintNota} className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg text-sm shadow-md transition">🖨️ Cetak / Save PDF</button>
            </div>

            {/* AREA KERTAS THERMAL */}
            <div className="bg-white text-black p-4 w-[280px] shadow-2xl print:shadow-none print:w-[58mm] print:p-2 font-mono text-[11px] leading-tight break-inside-avoid">
              
              <div className="text-center mb-4">
                <h2 className="font-black text-lg">GETMOI CLOTHES STORE</h2>
                <p className="border-b-2 border-dashed border-black pb-2 mt-1">Nota Dapur Admin</p>
              </div>

              <div className="mb-2">
                <p>Tgl : {notaAktif.tanggal}</p>
                <p>Ref : TRX-{String(notaAktif.refId).padStart(4, '0')}</p>
              </div>
              
              <div className="border-t border-dashed border-black pt-2 mb-2">
                <p className="font-bold mb-1">Rincian Item:</p>
                {renderItemNota(notaAktif)}
                <p className="pl-2 mt-2 text-[9px] font-bold">[Kode Gabungan: {notaAktif.kodeItem}]</p>
              </div>

              <div className="border-t border-b border-dashed border-black py-2 mb-2 space-y-1">
                <div className="flex justify-between">
                  <span>TOTAL HPP (Modal)</span>
                  <span>Rp {Number(notaAktif.hargaModal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>TOTAL JUAL</span>
                  <span>Rp {Number(notaAktif.hargaJual).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-sm pt-1">
                <span>PROFIT BERSIH</span>
                <span>Rp {Number(notaAktif.profit).toLocaleString('id-ID')}</span>
              </div>

              <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-black text-[9px]">
                <p>Dokumen Internal Getmoi</p>
                <p>Rahasia - Jangan Diberikan ke Pembeli</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🖥️ HALAMAN KASIR NORMAL 🖥️ */}
      <main className="print:hidden p-8 font-sans text-gray-800 max-w-7xl mx-auto">
        <div className="space-y-6">
          
          <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-pink-100">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 bg-pink-50 rounded-xl shadow-sm hover:bg-pink-100 text-pink-600 transition font-medium text-sm">&larr; Kembali</Link>
              <h1 className="text-xl font-extrabold text-gray-900">Ruang Kasir</h1>
            </div>
            <button onClick={handleTarikData} disabled={loadingTarik} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 transition-all text-xs shadow-sm">
              {loadingTarik ? '⏳ Menyedot...' : '🔄 Refresh Data Awan'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-pink-50 pb-2">📦 Keranjang Pesanan</h2>
                
                <div className="flex gap-3 mb-6">
                  <select value={barangPilihan} onChange={(e) => setBarangPilihan(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 font-medium text-sm">
                    <option value="">+ Tambah Baju / Packaging...</option>
                    {barangBelumDipilih.map(item => (
                      <option key={item.kodeItem} value={item.kodeItem}>[{item.kodeItem}] {item.namaBarang} - (Modal: Rp {(item.hargaModal || 0).toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                  <button onClick={tambahKeKeranjang} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 shadow-md">Add</button>
                </div>

                <div className="space-y-3">
                  {keranjang.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <span className="font-bold text-pink-600 text-xs mr-2">[{item.kodeItem}]</span>
                        <span className="font-bold text-gray-700">{item.namaBarang}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-500">Rp {(item.hargaModal || 0).toLocaleString('id-ID')}</span>
                        <button onClick={() => hapusDariKeranjang(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg font-medium text-sm">Hapus</button>
                      </div>
                    </div>
                  ))}
                  {keranjang.length === 0 && <div className="text-center p-6 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-2xl">Keranjang kosong.</div>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-pink-50 pb-2">💳 Rincian Pembayaran</h2>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500 text-xs uppercase">Total Modal</span>
                  <span className="text-sm font-black text-gray-800">Rp {totalModal.toLocaleString('id-ID')}</span>
                </div>
                <div className="space-y-5">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Metode Bayar</label>
                    <select value={metodeBayar} onChange={(e) => setMetodeBayar(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm">
                      <option value="Transfer BCA">Transfer BCA</option>
                      <option value="Transfer Seabank">Transfer Seabank</option>
                      <option value="Full Shopee">Full Shopee</option>
                      <option value="Cash / Lainnya">Cash / Lainnya</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Harga Jual Akhir</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-400 font-bold">Rp</span>
                      <input type="number" value={hargaJual} onChange={(e) => setHargaJual(e.target.value)} placeholder="150000" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${potensiProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${potensiProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Estimasi Profit Bersih</p>
                    <h3 className={`text-2xl font-black ${potensiProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {potensiProfit >= 0 ? '+' : ''} Rp {potensiProfit.toLocaleString('id-ID')}
                    </h3>
                  </div>

                  <button onClick={handleSimpanTransaksi} disabled={isSaving} className="w-full mt-4 py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50">
                    {isSaving ? '⏳ Menyimpan & Motong Stok...' : 'Selesaikan Transaksi & Cetak'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 mt-6">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">🧾 Riwayat Penjualan Terakhir</h2>
              <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-lg border border-pink-100">
                Total Tercatat: {riwayatPenjualan.length} Trx
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-pink-50/90 text-gray-500 text-[10px] uppercase tracking-wider border-b border-pink-100 backdrop-blur-sm">
                    <th className="p-4 rounded-tl-xl font-bold">Tanggal</th>
                    <th className="p-4 font-bold">Kode Item</th>
                    <th className="p-4 font-bold">Barang Terjual</th>
                    <th className="p-4 font-bold">Total HPP</th>
                    <th className="p-4 font-bold">Total Jual</th>
                    <th className="p-4 font-bold">Profit</th>
                    <th className="p-4 rounded-tr-xl font-bold text-center">Cetak</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                  {riwayatPenjualan.map((trx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-xs font-medium text-gray-500 whitespace-nowrap">{trx.tanggal}</td>
                      <td className="p-4 font-bold text-pink-600 text-xs whitespace-nowrap">{trx.kodeItem}</td>
                      <td className="p-4 font-bold text-gray-800">{trx.namaBarang}</td>
                      <td className="p-4 font-bold text-red-500 whitespace-nowrap">Rp {(trx.hargaModal || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 font-bold text-blue-600 whitespace-nowrap">Rp {(trx.hargaJual || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 font-bold text-emerald-500 whitespace-nowrap">+ Rp {(trx.profit || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-center">
                        <button 
                          // 🚀 Tarik nomor urut dengan menghitung panjang array dikurang posisi index
                          onClick={() => setNotaAktif({ ...trx, refId: riwayatPenjualan.length - idx })} 
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold transition">
                          🖨️ Nota
                        </button>
                      </td>
                    </tr>
                  ))}
                  {riwayatPenjualan.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 font-bold italic">Belum ada transaksi terekam.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}