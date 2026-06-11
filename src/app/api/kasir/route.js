import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    // Tarik data dari Supabase, langsung urutkan dari yang paling baru
    const { data: dbData, error } = await supabase
      .from('penjualan')
      .select('*')
      .order('id', { ascending: false }); // Pengganti formatData.reverse()

    if (error) throw error;

    // Mapping dari nama kolom Supabase ke variabel frontend lu
    const formatData = dbData.map((row) => ({
      id: row.id, // Langsung pake ID asli dari database!
      tanggal: row.tanggal || '',
      kodeItem: row.kode_item || '',
      namaBarang: row.nama_barang || '',
      hargaModal: Number(row.harga_modal) || 0,
      hargaJual: Number(row.harga_jual) || 0,
      qty: Number(row.qty) || 1,
      profit: Number(row.profit) || 0
    }));

    return NextResponse.json({ success: true, data: formatData }); 
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🚀 FUNGSI BARU: SIMPAN PENJUALAN + AUTO POTONG STOK GUDANG VIA SUPABASE 🚀
export async function POST(request) {
  try {
    const data = await request.json();

    // 1. Tulis Transaksi Baru ke Tabel 'penjualan'
    const { error: insertError } = await supabase
      .from('penjualan')
      .insert([{
        tanggal: data.tanggal,
        kode_item: data.kodeItem,
        nama_barang: data.namaBarang,
        harga_modal: Number(data.hargaModal),
        harga_jual: Number(data.hargaJual),
        qty: Number(data.qty),
        total_penjualan: Number(data.hargaJual), // Sesuai logika asli lu
        profit: Number(data.profit),
        profit_persen: data.profitPersen
      }]);

    if (insertError) throw insertError;

    // 2. 🚀 EKSEKUSI POTONG STOK DI TABEL 'barang' 🚀
    if (data.keranjang && data.keranjang.length > 0) {
      // Rekap total qty yang dibeli per kode item
      const rekapBeli = {};
      data.keranjang.forEach(item => {
        rekapBeli[item.kodeItem] = (rekapBeli[item.kodeItem] || 0) + 1;
      });

      // Update stoknya ke Supabase
      for (const [kodeItem, qtyBeli] of Object.entries(rekapBeli)) {
        // Ambil stok saat ini pakai Supabase single-fetch
        const { data: barangData, error: getError } = await supabase
          .from('barang')
          .select('stok')
          .eq('kode_item', kodeItem)
          .single();

        if (!getError && barangData) {
          const currentStok = Number(barangData.stok) || 0;
          const newStok = Math.max(0, currentStok - qtyBeli); // Cegah minus
          
          // Tembak stok barunya!
          await supabase
            .from('barang')
            .update({ stok: newStok })
            .eq('kode_item', kodeItem);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Berhasil nulis transaksi & motong stok di Supabase!' });
  } catch (error) {
    console.error("Gagal nyatet penjualan:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}