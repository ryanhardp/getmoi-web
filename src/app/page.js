"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const MODAL_AWAL = 700000; 
  const [uangTertahan, setUangTertahan] = useState(0);
  const [operasional, setOperasional] = useState(0);
  const [labaKotor, setLabaKotor] = useState(0); 
  const [riwayatTransaksi, setRiwayatTransaksi] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Hitung Stok
    const dbGudang = JSON.parse(localStorage.getItem('db_getmoiclothes') || '[]');
    let aset = 0;
    dbGudang.forEach(item => { aset += (item.hargaModal || item.hpp || 0) * (item.stok || 0); });
    setUangTertahan(aset);

    // 2. Hitung Operasional
    const dbOpr = JSON.parse(localStorage.getItem('db_operasional') || '[]');
    let opr = 0;
    dbOpr.forEach(item => { opr += (item.nominal || 0); });
    setOperasional(opr);

    // 3. Hitung Laba Kotor Penjualan
    const dbPenjualan = JSON.parse(localStorage.getItem('db_penjualan') || '[]');
    let profit = 0;
    dbPenjualan.forEach(trx => { profit += (Number(trx.profit) || 0); });
    setLabaKotor(profit);

    setRiwayatTransaksi([...dbPenjualan].slice(0, 5));
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  // 4. RUMUS AKUNTANSI ANTI BOCOR
  const labaBersih = labaKotor - operasional;
  const sisaKas = MODAL_AWAL - uangTertahan + labaBersih;

  return (
    <main className="p-8 font-sans text-gray-800 max-w-6xl mx-auto">
      <div className="mb-8 mt-4 border-b border-pink-200 pb-6">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Dashboard Getmoi 🌸</h1>
        <p className="text-gray-500 font-medium">Ringkasan Keuangan Global & Operasional</p>
      </div>

      <div className="mb-10">
        
        {/* BARIS 1: Modal, Kas, Stok */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        </div>

        {/* BARIS 2: Laba Kotor, Operasional, Laba Bersih */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Laba Kotor (Untung Transaksi)</p>
            <h3 className="text-2xl font-black text-gray-800">Rp {labaKotor.toLocaleString('id-ID')}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Operasional (Non-Stok)</p>
            <h3 className="text-2xl font-black text-red-500">- Rp {operasional.toLocaleString('id-ID')}</h3>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1">Laba Bersih (Net Profit)</p>
            <h3 className="text-2xl font-black text-white">+ Rp {labaBersih.toLocaleString('id-ID')}</h3>
          </div>
        </div>

      </div>

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
              {riwayatTransaksi.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-bold italic">Belum ada transaksi terekam.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}