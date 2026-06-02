"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DatabaseAdmin() {
  const [daftarBarang, setDaftarBarang] = useState([]);
  const [kamusKode, setKamusKode] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTarik, setLoadingTarik] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const loadDataCloud = async () => {
    try {
      const res = await fetch('/api/gudang');
      const respon = await res.json();
      
      if (respon.success) {
        const parsedData = respon.data.map(item => {
          const isPack = String(item.kodeItem).startsWith('P');
          const hargaBersih = Number(String(item.hargaModal).replace(/[^0-9]/g, '')) || 0;
          const stokBersih = Number(item.stok) || 0;

          return {
            ...item,
            hargaModal: hargaBersih,
            stok: stokBersih,
            kategori: isPack ? 'Packaging' : 'Baju Thrifting',
            status: stokBersih === 0 && !isPack ? 'Sold Out' : (isPack && stokBersih < 15 ? (stokBersih === 0 ? 'Habis' : 'Menipis') : (isPack ? 'Aman' : 'Ready'))
          };
        });
        setDaftarBarang(parsedData);
      }
    } catch (error) {
      console.error("Gagal load dari awan:", error);
    }
  };

  useEffect(() => {
    // Bersihin memori sesat masa lalu
    localStorage.removeItem('kamus_getmoiclothes');
    setKamusKode({ kemeja: 'A', inner: 'B', dress: 'D', cardigan: 'E', vest: 'F', packaging: 'P', plastik: 'P', print: 'P' });
    
    loadDataCloud().then(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('kamus_getmoiclothes', JSON.stringify(kamusKode));
      localStorage.setItem('db_getmoiclothes', JSON.stringify(daftarBarang)); 
    }
  }, [daftarBarang, kamusKode, isLoaded]);

  const [inputNama, setInputNama] = useState('');
  const [kategori, setKategori] = useState('Baju Thrifting');
  const [inputModal, setInputModal] = useState('');
  const [kodeItem, setKodeItem] = useState('---');
  const [stok, setStok] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);

  // 🚀 LOGIKA GENERATOR FIX: KUNCI STRICT KATA PERTAMA DOANG!
  useEffect(() => {
    if (isEditMode) return; 
    if (inputNama.trim().length > 0) {
      const kataPertamaInput = inputNama.trim().split(' ')[0].toLowerCase();
      let prefixAkurat = '';
      
      // Murni ngecek kata pertama VS kata pertama (Biar Kemeja Blouse ga ganggu Blouse)
      const barangSama = daftarBarang.find(b => {
        if (!b.namaBarang) return false;
        const kataPertamaDB = b.namaBarang.trim().split(' ')[0].toLowerCase();
        return kataPertamaDB === kataPertamaInput;
      });

      if (barangSama && barangSama.kodeItem) {
        // Kalau nemu, culik huruf depannya
        prefixAkurat = barangSama.kodeItem.replace(/[0-9]/g, '').toUpperCase();
      } else if (kamusKode[kataPertamaInput]) {
        // Cek kamus cadangan
        prefixAkurat = kamusKode[kataPertamaInput].toUpperCase();
      } else if (kategori === 'Packaging') {
        prefixAkurat = 'P';
      } else {
        // BARANG ALIEN: Ngabsen huruf A-Z yang nganggur
        const hurufKepake = new Set();
        daftarBarang.forEach(b => { if(b.kodeItem) hurufKepake.add(b.kodeItem.replace(/[0-9]/g, '').toUpperCase()) });
        Object.values(kamusKode).forEach(val => hurufKepake.add(val.toUpperCase()));

        const abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
        prefixAkurat = abjad.find(huruf => !hurufKepake.has(huruf)) || 'X'; 
      }

      // Cari angka urutan selanjutnya
      const barangSejenis = daftarBarang.filter(item => item.kodeItem && item.kodeItem.toUpperCase().startsWith(prefixAkurat));
      let angkaTertinggi = 0;
      barangSejenis.forEach(b => {
        const angka = parseInt(b.kodeItem.replace(/[^0-9]/g, '') || 0);
        if (angka > angkaTertinggi) angkaTertinggi = angka;
      });

      setKodeItem(`${prefixAkurat}${angkaTertinggi + 1}`);
    } else { setKodeItem('---'); }
    
    if (kategori === 'Baju Thrifting') setStok(1); 
    else if (kategori === 'Packaging' && stok === 1) setStok(100); 
  }, [inputNama, kategori, daftarBarang, isEditMode, kamusKode]);

  const handleSimpan = async () => {
    if (!inputNama.trim()) return; 
    setIsSaving(true);

    const method = isEditMode ? 'PUT' : 'POST';
    const payload = { kodeItem, namaBarang: inputNama, hargaModal: Number(inputModal), stok: Number(stok) };
    if (isEditMode) payload.row = editingRow;

    try {
      const res = await fetch('/api/gudang', {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      });
      const respon = await res.json();
      
      if (respon.success) {
        alert(isEditMode ? "✅ Data berhasil di-update ke awan!" : "✅ Barang baru berhasil disimpen ke awan!");
        
        // Simpan ke kamus kalau barang baru
        const kataPertama = inputNama.trim().split(' ')[0].toLowerCase();
        if (!isEditMode && !kamusKode[kataPertama]) {
          setKamusKode(prev => ({ ...prev, [kataPertama]: kodeItem.charAt(0) }));
        }

        setIsEditMode(false); setEditingRow(null);
        setInputNama(''); setInputModal(''); setStok(kategori === 'Baju Thrifting' ? 1 : 100);
        await loadDataCloud();
      } else {
        alert("❌ Gagal simpan ke Sheets: " + respon.error);
      }
    } catch (error) {
      alert("❌ Error sistem: " + error.message);
    }
    setIsSaving(false);
  };

  const handleEdit = (item) => {
    setIsEditMode(true); setKodeItem(item.kodeItem); setInputNama(item.namaBarang);
    setStok(item.stok); setInputModal(item.hargaModal || ''); setKategori(item.kategori || 'Baju Thrifting');
    setEditingRow(item.row);
  };

  const handleHapus = async (item) => {
    const gas = confirm(`⚠️ Yakin mau hapus ${item.namaBarang} dari awan secara permanen?`);
    if (!gas) return;

    try {
      const res = await fetch('/api/gudang', {
        method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ row: item.row })
      });
      if ((await res.json()).success) {
        alert("✅ Barang dihapus dari Sheets!");
        await loadDataCloud();
      }
    } catch (error) {
      alert("❌ Error hapus: " + error.message);
    }
  };

  const handleTarikData = async () => {
    setLoadingTarik(true);
    await loadDataCloud();
    alert("✅ Data berhasil di-refresh dari awan!");
    setLoadingTarik(false);
  };

  const getTabelRapih = () => {
    const dataDibalik = [...daftarBarang].reverse();

    const packaging = dataDibalik.filter(item => item.kategori === 'Packaging');
    const barangReady = dataDibalik.filter(item => item.kategori !== 'Packaging' && item.status !== 'Sold Out' && item.status !== 'Habis');
    const barangSoldOut = dataDibalik.filter(item => item.kategori !== 'Packaging' && (item.status === 'Sold Out' || item.status === 'Habis'));
    
    return [...packaging, ...barangReady, ...barangSoldOut];
  };

  const dataTampil = getTabelRapih();

  if (!isLoaded) return null;

  return (
    <main className="p-8 font-sans text-gray-800 max-w-7xl mx-auto">
      <div className="space-y-8">

        <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-pink-100">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-pink-50 rounded-xl shadow-sm hover:bg-pink-100 text-pink-600 transition font-medium text-sm">
              &larr; Kembali
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900">Database Gudang</h1>
          </div>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold shadow-sm animate-pulse">
            ☁️ Cloud Mode Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-pink-100 h-fit">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">{isEditMode ? '✏️ Edit Item' : '➕ Tambah Stok Baru'}</h2>
              {isEditMode && <button onClick={() => { setIsEditMode(false); setEditingRow(null); setInputNama(''); setInputModal(''); }} className="text-xs text-red-500 font-bold hover:underline">Batal Edit</button>}
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

              <button onClick={handleSimpan} disabled={isSaving} className={`w-full mt-2 py-3 text-white font-bold rounded-xl shadow-md transition-all ${isEditMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/30'} disabled:opacity-50`}>
                {isSaving ? 'Menyimpan ke Awan...' : isEditMode ? 'Update Data' : 'Simpan Barang'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
            <div className="flex justify-between items-center mb-4 border-b border-pink-50 pb-2">
              <h2 className="text-lg font-bold text-gray-800">🗄️ Master Data Barang</h2>
              <button 
                onClick={handleTarikData} 
                disabled={loadingTarik}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 hover:scale-105 transition-all text-xs shadow-sm flex items-center gap-2"
              >
                {loadingTarik ? '⏳ Sedang Refresh...' : '🔄 Refresh Tabel'}
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
                        <button onClick={() => handleHapus(item)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus Permanen">🗑️</button>
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