"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const MODAL_AWAL = 700000; 
  const [uangTertahan, setUangTertahan] = useState(0);
  const [totalStokBaju, setTotalStokBaju] = useState(0);
  const [operasional, setOperasional] = useState(0);
  const [prive, setPrive] = useState(0); 
  const [labaKotor, setLabaKotor] = useState(0); 
  const [totalPendapatan, setTotalPendapatan] = useState(0); // Buat P&L
  const [totalHPP, setTotalHPP] = useState(0); // Buat P&L
  const [riwayatTransaksi, setRiwayatTransaksi] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // State buat nampilin Modal Laporan P&L
  const [showPnL, setShowPnL] = useState(false);

  useEffect(() => {
    const tarikSemuaData = async () => {
      try {
        const [resGudang, resOpr, resJual] = await Promise.all([
          fetch('/api/gudang').then(r => r.json()),
          fetch('/api/operasional').then(r => r.json()),
          fetch('/api/kasir').then(r => r.json())
        ]);

        let aset = 0;
        let stokBaju = 0;
        if(resGudang.success) {
          resGudang.data.forEach(item => { 
            const isPack = String(item.kodeItem).startsWith('P') || item.kategori === 'Packaging';
            aset += (item.hargaModal || 0) * (item.stok || 0); 
            if (!isPack) stokBaju += (item.stok || 0);
          });
        }
        setUangTertahan(aset);
        setTotalStokBaju(stokBaju);

        let opr = 0;
        let tarikUntung = 0;
        if(resOpr.success) {
          resOpr.data.forEach(item => { 
            const ket = (item.keterangan || '').toLowerCase();
            if (ket.includes('prive') || ket.includes('bagi hasil') || ket.includes('reward')) {
              tarikUntung += (item.nominal || 0);
            } else {
              opr += (item.nominal || 0); 
            }
          });
        }
        setOperasional(opr);
        setPrive(tarikUntung);

        let profit = 0;
        let pendapatan = 0;
        let hpp = 0;
        if(resJual.success) {
          resJual.data.forEach(trx => { 
            profit += (Number(trx.profit) || 0); 
            pendapatan += (Number(trx.hargaJual) || 0);
            hpp += (Number(trx.hargaModal) || 0);
          });
          setRiwayatTransaksi(resJual.data.slice(0, 5));
        }
        setLabaKotor(profit);
        setTotalPendapatan(pendapatan);
        setTotalHPP(hpp);

      } catch (error) {
        console.error("Gagal nyedot data Dashboard", error);
      } finally {
        setIsLoaded(true);
      }
    };

    tarikSemuaData();
  }, []);

  const labaBersih = labaKotor - operasional;
  const sisaKas = MODAL_AWAL - uangTertahan + labaBersih - prive;

  const handleCetakPDF = () => {
    window.print();
  };

  return (
    <>
      {/* 🚀 MODAL LAPORAN P&L (MUNCUL PAS TOMBOL DIKLIK) 🚀 */}
      {showPnL && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto print:bg-white print:overflow-visible flex justify-center py-10 print:py-0">
          <div className="bg-white w-full max-w-3xl min-h-[1056px] p-12 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:p-8 relative">
            
            {/* Tombol Aksi (Hilang pas diprint) */}
            <div className="absolute top-6 right-6 flex gap-3 print:hidden">
              <button onClick={() => setShowPnL(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition">Batal</button>
              <button onClick={handleCetakPDF} className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg transition">🖨️ Cetak / Save PDF</button>
            </div>

            {/* HEADER KOP SURAT */}
            <div className="border-b-4 border-gray-900 pb-6 mb-8 mt-4 print:mt-0">
              <h1 className="text-4xl font-black uppercase tracking-widest text-gray-900">Getmoi Thrifting</h1>
              <h2 className="text-xl font-bold text-pink-600 mt-1">Laporan Laba Rugi (Profit & Loss)</h2>
              <p className="text-gray-500 font-medium mt-2">Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* ISI LAPORAN AKUNTANSI */}
            <div className="space-y-6 text-gray-800">
              
              {/* PENDAPATAN */}
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900 border-b border-gray-200 pb-1">1. PENDAPATAN (REVENUE)</h3>
                <div className="flex justify-between text-base pl-4">
                  <p>Total Penjualan Kotor</p>
                  <p className="font-medium">Rp {totalPendapatan.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* HPP */}
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900 border-b border-gray-200 pb-1">2. HARGA POKOK PENJUALAN (COGS)</h3>
                <div className="flex justify-between text-base pl-4 text-red-600">
                  <p>Total Modal Barang Terjual</p>
                  <p className="font-medium">(Rp {totalHPP.toLocaleString('id-ID')})</p>
                </div>
              </div>

              {/* LABA KOTOR */}
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-black text-xl">LABA KOTOR (GROSS PROFIT)</p>
                <p className="font-black text-xl">Rp {labaKotor.toLocaleString('id-ID')}</p>
              </div>

              {/* BEBAN OPERASIONAL */}
              <div>
                <h3 className="font-bold text-lg mb-2 mt-8 text-gray-900 border-b border-gray-200 pb-1">3. BEBAN OPERASIONAL</h3>
                <div className="flex justify-between text-base pl-4 text-red-600">
                  <p>Total Pengeluaran Bisnis Non-Stok</p>
                  <p className="font-medium">(Rp {operasional.toLocaleString('id-ID')})</p>
                </div>
              </div>

              {/* LABA BERSIH (HIGHLIGHT) */}
              <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-4">
                <p className="font-black text-2xl text-emerald-700">LABA BERSIH (NET PROFIT)</p>
                <p className="font-black text-2xl text-emerald-700">Rp {labaBersih.toLocaleString('id-ID')}</p>
              </div>

              {/* RINGKASAN KAS & PRIVE */}
              <div>
                <h3 className="font-bold text-lg mb-2 mt-12 text-gray-900 border-b border-gray-200 pb-1">MUTASI KAS & PENARIKAN</h3>
                <div className="flex justify-between text-base pl-4 text-purple-600 mb-2">
                  <p>Penarikan Dana (Prive / Bagi Hasil Partner)</p>
                  <p className="font-medium">(Rp {prive.toLocaleString('id-ID')})</p>
                </div>
                <div className="flex justify-between text-base pl-4 text-blue-600 mb-2">
                  <p>Uang Tertahan di Stok Barang (Aset Fisik)</p>
                  <p className="font-medium">Rp {uangTertahan.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex justify-between text-base pl-4 font-bold text-gray-900 mt-4 pt-4 border-t border-gray-200">
                  <p>SISA KAS FISIK (TUNAI/REKENING)</p>
                  <p>Rp {sisaKas.toLocaleString('id-ID')}</p>
                </div>
              </div>

            </div>

            {/* TANDA TANGAN */}
            <div className="mt-20 flex justify-end print:mt-32">
              <div className="text-center">
                <p className="mb-16 text-gray-600">Disetujui Oleh,</p>
                <p className="font-bold text-gray-900 underline">Owner / Management</p>
                <p className="text-sm text-gray-500">Getmoi Thrifting</p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-400 print:block">
              <p>Di-generate secara otomatis oleh Sistem Getmoi Terintegrasi.</p>
            </div>

          </div>
        </div>
      )}

      {/* 🖥️ DASHBOARD NORMAL (Disembunyikan kalau lagi mode print PDF) 🖥️ */}
      <main className="print:hidden p-8 font-sans text-gray-800 max-w-7xl mx-auto">
        <div className="mb-8 mt-4 border-b border-pink-200 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Dashboard Getmoi 🌸</h1>
            <p className="text-gray-500 font-medium">Ringkasan Keuangan Global & Operasional</p>
          </div>
          <div className="flex gap-4 items-center">
            {!isLoaded && <span className="text-sm font-bold text-blue-500 animate-pulse bg-blue-50 px-4 py-2 rounded-xl">☁️ Sinkronisasi dari Sheets...</span>}
            {/* TOMBOL SAKTI CETAK P&L */}
            {isLoaded && (
              <button onClick={() => setShowPnL(true)} className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                📄 Buat Laporan P&L
              </button>
            )}
          </div>
        </div>

        {isLoaded && (
          <div className="mb-10 animate-fade-in space-y-4">
            
            {/* BARIS 1: KONDISI KAS & ASET */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Modal Awal</p>
                <h3 className="text-2xl font-black text-gray-800">Rp {MODAL_AWAL.toLocaleString('id-ID')}</h3>
              </div>
              
              <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-5 rounded-2xl shadow-lg shadow-pink-500/20 text-white flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
                <p className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mb-1">Sisa Kas Fisik di Tangan</p>
                <h3 className="text-2xl font-black text-white">Rp {sisaKas.toLocaleString('id-ID')}</h3>
              </div>
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Uang Tertahan di Stok</p>
                <h3 className="text-2xl font-black text-blue-600">Rp {uangTertahan.toLocaleString('id-ID')}</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Stok Baju (Fisik)</p>
                <h3 className="text-2xl font-black text-amber-500">{totalStokBaju} <span className="text-sm font-bold text-gray-500">pcs</span></h3>
              </div>
            </div>

            {/* BARIS 2: PERFORMA BISNIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Laba Kotor (Untung Jualan)</p>
                <h3 className="text-2xl font-black text-gray-800">Rp {labaKotor.toLocaleString('id-ID')}</h3>
              </div>
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Operasional (Beban Bisnis)</p>
                <h3 className="text-2xl font-black text-red-500">- Rp {operasional.toLocaleString('id-ID')}</h3>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
                <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1">Laba Bersih (Net Profit)</p>
                <h3 className="text-2xl font-black text-white">+ Rp {labaBersih.toLocaleString('id-ID')}</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tarik Untung (Prive/Reward)</p>
                <h3 className="text-2xl font-black text-purple-600">- Rp {prive.toLocaleString('id-ID')}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🚀 Jalan Pintas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/kasir" className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 hover:shadow-md transition-all">
              <h2 className="text-xl font-bold text-gray-800">🛒 Kasir Transaksi</h2>
            </Link>
            <Link href="/database" className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 hover:shadow-md transition-all">
              <h2 className="text-xl font-bold text-gray-800">📦 Database Baju</h2>
            </Link>
            <Link href="/operasional" className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 hover:shadow-md transition-all">
              <h2 className="text-xl font-bold text-gray-800">💸 Operasional</h2>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">🧾 5 Transaksi Terakhir</h2>
            <Link href="/kasir" className="text-sm text-pink-500 hover:underline font-medium">Buka Kasir &rarr;</Link>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-pink-50/50 text-gray-500 text-[10px] uppercase tracking-wider border-b border-pink-100">
                  <th className="p-4 rounded-tl-xl font-bold">Tanggal</th>
                  <th className="p-4 font-bold">Kode Item</th>
                  <th className="p-4 font-bold">Nama Barang</th>
                  <th className="p-4 font-bold">Harga Jual</th>
                  <th className="p-4 rounded-tr-xl font-bold">Profit</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                {riwayatTransaksi.map((trx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-xs text-gray-500">{trx.tanggal}</td>
                    <td className="p-4 font-bold text-pink-600">{trx.kodeItem}</td>
                    <td className="p-4 font-bold text-gray-800">{trx.namaBarang}</td>
                    <td className="p-4 font-bold text-blue-600">Rp {(trx.hargaJual || 0).toLocaleString('id-ID')}</td>
                    <td className="p-4 font-bold text-emerald-500">+ Rp {(trx.profit || 0).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {riwayatTransaksi.length === 0 && isLoaded && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-bold italic">Belum ada transaksi terekam.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}