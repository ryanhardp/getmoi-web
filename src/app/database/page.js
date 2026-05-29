"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DatabaseAdmin() {
  const [daftarBarang, setDaftarBarang] = useState([]);
  const [kamusKode, setKamusKode] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTarik, setLoadingTarik] = useState(false);

  useEffect(() => {
    const dataTersimpan = localStorage.getItem('db_getmoiclothes');
    const kamusTersimpan = localStorage.getItem('kamus_getmoiclothes');

    if (dataTersimpan) {
      let parsedData = JSON.parse(dataTersimpan);
      parsedData = parsedData.map(item => ({
        kodeItem: item.kodeItem || item.id,
        namaBarang: item.namaBarang || item.nama,
        hargaModal: item.hargaModal || item.hpp || 0,
        stok: Number(item.stok) || 0,
        kategori: item.kategori || (String(item.kodeItem || item.id).startsWith('P') ? 'Packaging' : 'Baju Thrifting'),
        status: item.stok === 0 && (!item.kategori || item.kategori === 'Baju Thrifting') ? 'Sold Out' : (item.status || 'Ready')
      }));
      setDaftarBarang(parsedData);
    } else { setDaftarBarang([]); }

    if (kamusTersimpan) setKamusKode(JSON.parse(kamusTersimpan));
    else setKamusKode({ kemeja: 'A', inner: 'B', blouse: 'C', dress: 'D', cardigan: 'E', vest: 'F', packaging: 'P', plastik: 'P', print: 'P' });
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('db_getmoiclothes', JSON.stringify(daftarBarang));
      localStorage.setItem('kamus_getmoiclothes', JSON.stringify(kamusKode));
    }
  }, [daftarBarang, kamusKode, isLoaded]);

  const [inputNama, setInputNama] = useState('');
  const [kategori, setKategori] = useState('Baju Thrifting');
  const [inputModal, setInputModal] = useState('');
  const [kodeItem, setKodeItem] = useState('---');
  const [stok, setStok] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);

  // LOGIKA BARU: BIKIN KODE BARANG NGELANJUTIN EXISTING DATA
  useEffect(() => {
    if (isEditMode) return; 
    if (inputNama.trim().length > 0) {
      const kataPertama = inputNama.trim().split(' ')[0].toLowerCase();
      let prefix = kamusKode[kataPertama] || 'Z';
      
      // Cari angka paling mentok dari kode yang udah ada (Misal udah ada A15, berarti next-nya A16)
      const barangSejenis = daftarBarang.filter(item => item.kodeItem && item.kodeItem.startsWith(prefix));
      let angkaTertinggi = 0;
      barangSejenis.forEach(b => {
        const angka = parseInt(b.kodeItem.replace(/[^0-9]/g, '') || 0);
        if (angka > angkaTertinggi) angkaTertinggi = angka;
      });

      setKodeItem(`${prefix}${angkaTertinggi + 1}`);
    } else { setKodeItem('---'); }
    
    if (kategori === 'Baju Thrifting') setStok(1); 
    else if (kategori === 'Packaging' && stok === 1) setStok(100); 
  }, [inputNama, kategori, daftarBarang, isEditMode, kamusKode]);

  const handleSimpan = async () => {
    if (!inputNama.trim()) return; 
    const statusBaru = (kategori === 'Baju Thrifting') ? (Number(stok) > 0 ? 'Ready' : 'Sold Out') : (Number(stok) > 15 ? 'Aman' : Number(stok) > 0 ? 'Menipis' : 'Habis');
    
    if (isEditMode) {
      setDaftarBarang(daftarBarang.map(item => item.kodeItem === kodeItem ? { ...item, namaBarang: inputNama, stok: Number(stok), hargaModal: Number(inputModal), status: statusBaru, kategori } : item));
      setIsEditMode(false);
    } else {
      setDaftarBarang([...daftarBarang, { kodeItem, namaBarang: inputNama, stok: Number(stok), hargaModal: Number(inputModal), status: statusBaru, kategori }]);
      const kataPertama = inputNama.trim().split(' ')[0].toLowerCase();
      if (!kamusKode[kataPertama]) setKamusKode(prev => ({ ...prev, [kataPertama]: kodeItem.charAt(0) }));
    }
    setInputNama(''); setInputModal(''); setStok(kategori === 'Baju Thrifting' ? 1 : 100);
  };

  const handleEdit = (item) => {
    setIsEditMode(true); setKodeItem(item.kodeItem); setInputNama(item.namaBarang);
    setStok(item.stok); setInputModal(item.hargaModal || ''); setKategori(item.kategori || 'Baju Thrifting');
  };

  const handleHapus = (kode) => { setDaftarBarang(daftarBarang.filter(item => item.kodeItem !== kode)); };

  const handleTarikData = async () => {
    const gas = confirm("⚠️ Ini bakal masukin semua data dari tab 'Barang' Google Sheets lu ke web. Lanjut?");
    if (!gas) return;

    setLoadingTarik(true);
    try {
      const res = await fetch('/api/gudang');
      const respon = await res.json();
      
      if (respon.success) {
        setDaftarBarang(respon.data);
        alert(`✅ Suksessss! Berhasil narik ${respon.data.length} barang dari Sheets!`);
      } else {
        alert("❌ Gagal narik data: " + respon.error);
      }
    } catch (error) {
      alert("❌ Error sistem: " + error.message);
    }
    setLoadingTarik(false);
  };

  // LOGIKA BARU: NGURUTIN TABEL BIAR RAPI (Packaging -> Ready -> Sold Out)
  const getTabelRapih = () => {
    // Fungsi buat ngurutin kode angka (Biar A2 di atas A10)
    const sortByKode = (a, b) => {
      const prefixA = (a.kodeItem || '').replace(/[0-9]/g, '');
      const numA = parseInt((a.kodeItem || '').replace(/[^0-9]/g, '') || 0);
      const prefixB = (b.kodeItem || '').replace(/[0-9]/g, '');
      const numB = parseInt((b.kodeItem || '').replace(/[^0-9]/g, '') || 0);
      if (prefixA === prefixB) return numA - numB;
      return prefixA.localeCompare(prefixB);
    };

    const packaging = daftarBarang.filter(item => item.kategori === 'Packaging' || (item.kodeItem && item.kodeItem.startsWith('P'))).sort(sortByKode);
    const barangReady = daftarBarang.filter(item => item.kategori !== 'Packaging' && !(item.kodeItem && item.kodeItem.startsWith('P')) && item.status !== 'Sold Out' && item.status !== 'Habis').sort(sortByKode);
    const barangSoldOut = daftarBarang.filter(item => item.kategori !== 'Packaging' && !(item.kodeItem && item.kodeItem.startsWith('P')) && (item.status === 'Sold Out' || item.status === 'Habis')).sort(sortByKode);
    
    return [...packaging, ...barangReady, ...barangSoldOut];
  };

  const dataTampil = getTabelRapih();

  if (!isLoaded) return null;

  return (
    <main className="p-8 font-sans text-gray-800 max-w-7xl mx-auto">
      <div className="space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-pink-100">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-pink-50 rounded-xl shadow-sm hover:bg-pink-100 text-pink-600 transition font-medium text-sm">
              &larr; Kembali
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900">Database Gudang</h1>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
            ● Mode Lokal Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Kolom Kiri: Form Input */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-pink-100 h-fit">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">{isEditMode ? '✏️ Edit Item' : '➕ Tambah Stok Baru'}</h2>
              {isEditMode && <button onClick={() => { setIsEditMode(false); setInputNama(''); setInputModal(''); }} className="text-xs text-red-500 font-bold hover:underline">Batal Edit</button>}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} disabled={isEditMode} className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 font-medium disabled:opacity-50 transition">
                  <option value="Baju Thrifting">👗 Baju Thrifting</option>
                  <option value="Packaging">📦 Packaging</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Barang</label>
                <input type="text" value={inputNama} onChange={(e) => setInputNama(e.target.value)} placeholder="Contoh: Kemeja Polka Biru" className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Kode Item</p>
                  <p className="font-mono font-bold text-pink-600">{kodeItem}</p>
                </div>
                <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Stok</p>
                  <input type="number" value={stok} onChange={(e) => setStok(e.target.value)} disabled={kategori === 'Baju Thrifting' && !isEditMode} className="w-full bg-transparent font-bold text-gray-800 outline-none disabled:text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Harga Modal</label>
                <input type="number" value={inputModal} onChange={(e) => setInputModal(e.target.value)} placeholder="Contoh: 16600" className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold transition" />
              </div>

              <button onClick={handleSimpan} className={`w-full mt-2 py-3 text-white font-bold rounded-xl shadow-md transition-all ${isEditMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/30'}`}>
                {isEditMode ? 'Update Data' : 'Simpan Barang'}
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Tabel */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">🗄️ Master Data Barang</h2>
              <button 
                onClick={handleTarikData} 
                disabled={loadingTarik}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 hover:scale-105 transition-all text-xs shadow-sm flex items-center gap-2"
              >
                {loadingTarik ? '⏳ Sedang Menyedot...' : '☁️ Tarik Data dari Sheets'}
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-pink-50/90 text-gray-500 text-[10px] uppercase tracking-wider border-b border-pink-100 backdrop-blur-sm">
                    <th className="p-4 rounded-tl-xl font-bold">Kode Item</th>
                    <th className="p-4 font-bold">Nama Barang</th>
                    <th className="p-4 font-bold">Harga Modal</th>
                    <th className="p-4 font-bold text-center">Stok</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 rounded-tr-xl font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm font-medium divide-y divide-gray-100">
                  {dataTampil.map((item) => (
                    <tr key={item.kodeItem} className={`hover:bg-gray-50 transition ${item.status === 'Sold Out' || item.status === 'Habis' ? 'opacity-50 bg-gray-50/50' : ''}`}>
                      <td className={`p-4 font-mono text-xs ${(item.kategori === 'Packaging' || (item.kodeItem && item.kodeItem.startsWith('P'))) ? 'text-amber-600' : 'text-pink-500'}`}>{item.kodeItem}</td>
                      <td className="p-4 font-bold text-gray-800">{item.namaBarang}</td>
                      <td className="p-4 font-bold text-gray-500">Rp {(item.hargaModal || 0).toLocaleString('id-ID')}</td>
                      <td className={`p-4 text-center ${item.stok > 1 ? 'font-black text-lg' : 'font-bold'} ${item.stok < 15 && item.stok > 1 ? 'text-red-500' : 'text-gray-800'}`}>
                        {item.stok}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${item.status === 'Menipis' ? 'text-red-600 bg-red-100' : item.status === 'Ready' || item.status === 'Aman' ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-200'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit Restock">✏️</button>
                        <button onClick={() => handleHapus(item.kodeItem)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus">🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {dataTampil.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400 font-bold italic">Belum ada barang di database.</td>
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