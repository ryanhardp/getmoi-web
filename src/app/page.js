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
  
  const [dataJualFull, setDataJualFull] = useState([]);
  const [dataOprFull, setDataOprFull] = useState([]);
  
  const [riwayatTransaksi, setRiwayatTransaksi] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [showPnL, setShowPnL] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
          setDataOprFull(resOpr.data); 
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
        if(resJual.success) {
          setDataJualFull(resJual.data); 
          resJual.data.forEach(trx => { 
            profit += (Number(trx.profit) || 0); 
          });
          setRiwayatTransaksi(resJual.data.slice(0, 5));
        }
        setLabaKotor(profit);

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

  const isWithinRange = (dateStr) => {
    if (!startDate && !endDate) return true; 
    if (!dateStr) return false; 

    try {
      const tanggalAja = dateStr.split(' ')[0];
      if (!tanggalAja) return false; 

      const itemDate = new Date(tanggalAja);
      if (isNaN(itemDate.getTime())) return false; 
      
      itemDate.setHours(0, 0, 0, 0);

      let isAfterStart = true;
      let isBeforeEnd = true;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        isAfterStart = itemDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        isBeforeEnd = itemDate <= end;
      }
      return isAfterStart && isBeforeEnd;
    } catch (error) {
      return false; 
    }
  };

  const filteredJual = dataJualFull.filter(trx => isWithinRange(trx.tanggal));
  const filteredOprFull = dataOprFull.filter(trx => isWithinRange(trx.tanggal));

  const filteredOpr = filteredOprFull.filter(item => {
    const ket = (item.keterangan || '').toLowerCase();
    return !(ket.includes('prive') || ket.includes('bagi hasil') || ket.includes('reward'));
  });
  const filteredPrive = filteredOprFull.filter(item => {
    const ket = (item.keterangan || '').toLowerCase();
    return (ket.includes('prive') || ket.includes('bagi hasil') || ket.includes('reward'));
  });

  const pnlPendapatan = filteredJual.reduce((acc, curr) => acc + (Number(curr.hargaJual) || 0), 0);
  const pnlHPP = filteredJual.reduce((acc, curr) => acc + (Number(curr.hargaModal) || 0), 0);
  const pnlLabaKotor = pnlPendapatan - pnlHPP;
  const pnlTotalOpr = filteredOpr.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const pnlTotalPrive = filteredPrive.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const pnlLabaBersih = pnlLabaKotor - pnlTotalOpr;

  const handleCetakPDF = () => {
    window.print();
  };

  return (
    <>
      {/* 🚀 MODAL LAPORAN P&L RINCI 🚀 */}
      {showPnL && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex justify-center py-10 print:absolute print:inset-0 print:block print:bg-white print:overflow-visible print:py-0">
          <div className="bg-white w-full max-w-5xl min-h-screen p-12 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:p-0 relative print:block print:w-full">
            
            <div className="mb-8 p-6 bg-pink-50 rounded-2xl border border-pink-100 print:hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-pink-800">⚙️ Pengaturan Laporan (Filter)</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowPnL(false)} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-lg transition">Tutup</button>
                  <button onClick={handleCetakPDF} className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm rounded-lg shadow-md transition">🖨️ Cetak PDF</button>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dari Tanggal</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 outline-none font-medium" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-400 outline-none font-medium" />
                </div>
              </div>
            </div>

            <div className="border-b-4 border-gray-900 pb-4 mb-8">
              <h1 className="text-4xl font-black uppercase tracking-widest text-gray-900">Getmoi Thrifting</h1>
              <h2 className="text-xl font-bold text-pink-600 mt-1">Mutasi Transaksi & Laba Rugi</h2>
              <p className="text-gray-600 font-medium mt-2">
                Periode: {startDate && endDate ? `${startDate} s/d ${endDate}` : startDate ? `Dari ${startDate}` : endDate ? `Sampai ${endDate}` : 'Semua Waktu (All Time)'}
              </p>
            </div>

            <div className="space-y-8 text-gray-800 text-sm">
              
              <div>
                <div className="bg-gray-900 text-white p-2 px-4 rounded-t-lg flex justify-between items-center">
                  <h3 className="font-bold text-base tracking-wide">1. RINCIAN PENDAPATAN & HPP</h3>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-100 font-bold text-gray-600 uppercase text-[10px]">
                    <tr>
                      <th className="border border-gray-200 p-2 text-left">Tanggal</th>
                      <th className="border border-gray-200 p-2 text-left w-1/3">Item Terjual</th>
                      <th className="border border-gray-200 p-2 text-right">HPP (Modal)</th>
                      <th className="border border-gray-200 p-2 text-right">Harga Jual</th>
                      <th className="border border-gray-200 p-2 text-right text-blue-600">Profit Bersih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJual.map((trx, i) => {
                      const hpp = Number(trx.hargaModal) || 0;
                      const jual = Number(trx.hargaJual) || 0;
                      const profit = jual - hpp;
                      return (
                        <tr key={trx.id || i} className="border-b border-gray-200">
                          <td className="p-2 border border-gray-200">{trx.tanggal}</td>
                          <td className="p-2 border border-gray-200 font-medium">{trx.namaBarang}</td>
                          <td className="p-2 border border-gray-200 text-right text-red-600 font-medium">(Rp {hpp.toLocaleString('id-ID')})</td>
                          <td className="p-2 border border-gray-200 text-right text-emerald-600 font-bold">Rp {jual.toLocaleString('id-ID')}</td>
                          <td className="p-2 border border-gray-200 text-right text-blue-600 font-bold">Rp {profit.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                    {filteredJual.length === 0 && <tr><td colSpan="5" className="p-4 text-center italic text-gray-400">Tidak ada transaksi penjualan di periode ini.</td></tr>}
                  </tbody>
                  <tfoot className="bg-gray-50 font-black">
                    <tr>
                      <td colSpan="2" className="p-2 border border-gray-200 text-right uppercase">Total Penjualan:</td>
                      <td className="p-2 border border-gray-200 text-right text-red-700">(Rp {pnlHPP.toLocaleString('id-ID')})</td>
                      <td className="p-2 border border-gray-200 text-right text-emerald-700">Rp {pnlPendapatan.toLocaleString('id-ID')}</td>
                      <td className="p-2 border border-gray-200 text-right text-blue-700">Rp {pnlLabaKotor.toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
                <div className="flex justify-end mt-2">
                  <div className="bg-blue-50 border border-blue-200 p-2 px-4 rounded-lg inline-block">
                    <span className="font-bold mr-4 text-blue-900">LABA KOTOR (GROSS PROFIT):</span>
                    <span className="font-black text-blue-700 text-lg">Rp {pnlLabaKotor.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-red-800 text-white p-2 px-4 rounded-t-lg flex justify-between items-center mt-6">
                  <h3 className="font-bold text-base tracking-wide">2. RINCIAN BEBAN OPERASIONAL</h3>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-100 font-bold text-gray-600 uppercase text-[10px]">
                    <tr>
                      <th className="border border-gray-200 p-2 text-left w-1/4">Tanggal</th>
                      <th className="border border-gray-200 p-2 text-left w-2/4">Keterangan Beban</th>
                      <th className="border border-gray-200 p-2 text-right">Nominal Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpr.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border border-gray-200">{item.tanggal}</td>
                        <td className="p-2 border border-gray-200 font-medium">{item.keterangan}</td>
                        <td className="p-2 border border-gray-200 text-right text-red-600 font-medium">(Rp {Number(item.nominal).toLocaleString('id-ID')})</td>
                      </tr>
                    ))}
                    {filteredOpr.length === 0 && <tr><td colSpan="3" className="p-4 text-center italic text-gray-400">Tidak ada beban operasional di periode ini.</td></tr>}
                  </tbody>
                  <tfoot className="bg-gray-50 font-black">
                    <tr>
                      <td colSpan="2" className="p-2 border border-gray-200 text-right uppercase">Total Beban Operasional:</td>
                      <td className="p-2 border border-gray-200 text-right text-red-700">(Rp {pnlTotalOpr.toLocaleString('id-ID')})</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-between items-center bg-emerald-100 p-5 rounded-xl border-2 border-emerald-400 my-6 shadow-sm break-inside-avoid">
                <p className="font-black text-2xl text-emerald-900 tracking-wide">LABA BERSIH (NET PROFIT)</p>
                <p className="font-black text-3xl text-emerald-700">Rp {pnlLabaBersih.toLocaleString('id-ID')}</p>
              </div>

              {filteredPrive.length > 0 && (
                <div className="break-inside-avoid">
                  <div className="bg-purple-800 text-white p-2 px-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold text-base tracking-wide">3. MUTASI PENARIKAN (PRIVE / REWARD)</h3>
                  </div>
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100 font-bold text-gray-600 uppercase text-[10px]">
                      <tr>
                        <th className="border border-gray-200 p-2 text-left w-1/4">Tanggal</th>
                        <th className="border border-gray-200 p-2 text-left w-2/4">Keterangan Tarikan</th>
                        <th className="border border-gray-200 p-2 text-right">Nominal Keluar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrive.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="p-2 border border-gray-200">{item.tanggal}</td>
                          <td className="p-2 border border-gray-200 font-medium">{item.keterangan}</td>
                          <td className="p-2 border border-gray-200 text-right text-purple-600 font-medium">(Rp {Number(item.nominal).toLocaleString('id-ID')})</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-black">
                      <tr>
                        <td colSpan="2" className="p-2 border border-gray-200 text-right uppercase">Total Penarikan (Prive):</td>
                        <td className="p-2 border border-gray-200 text-right text-purple-700">(Rp {pnlTotalPrive.toLocaleString('id-ID')})</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

            </div>

            <div className="mt-16 flex justify-end print:mt-24 break-inside-avoid">
              <div className="text-center">
                <p className="mb-16 text-gray-600">Disetujui Oleh,</p>
                <p className="font-bold text-gray-900 underline">Owner / Management</p>
                <p className="text-sm text-gray-500">Getmoi Thrifting</p>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-4 print:mt-12 break-inside-avoid">
              <p>Laporan Mutasi Terintegrasi Getmoi. Dokumen ini sah dan di-generate otomatis oleh sistem.</p>
            </div>

          </div>
        </div>
      )}

      {/* 🖥️ DASHBOARD NORMAL 🖥️ */}
      <main className="print:hidden p-8 font-sans text-gray-800 max-w-7xl mx-auto">
        <div className="mb-8 mt-4 border-b border-pink-200 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Dashboard Getmoi 🌸</h1>
            <p className="text-gray-500 font-medium">Ringkasan Keuangan Global & Operasional</p>
          </div>
          <div className="flex gap-4 items-center">
            {!isLoaded && <span className="text-sm font-bold text-blue-500 animate-pulse bg-blue-50 px-4 py-2 rounded-xl">☁️ Sinkronisasi dari Sheets...</span>}
            {isLoaded && (
              <button onClick={() => setShowPnL(true)} className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                📄 Buat Laporan P&L
              </button>
            )}
          </div>
        </div>

        {isLoaded && (
          <div className="mb-10 animate-fade-in space-y-4">
            
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