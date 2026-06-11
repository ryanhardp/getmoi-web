import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// 🔄 GET: Tarik data dari Supabase, pisahin Baju dan Packaging biar rapi
export async function GET() {
  try {
    // Tarik data urut berdasarkan waktu masuk (id) biar tahu mana yang paling baru
    const { data: dbData, error } = await supabase
      .from('barang')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    const data = dbData.map((row, i) => {
      // Mapping dari nama kolom Supabase ke variabel frontend lu
      const kodeItem = String(row.kode_item || '');
      const isPack = kodeItem.startsWith('P');
      const stok = Number(row.stok) || 0;
      
      // Logika status murni dari kodingan lu (TIDAK DIUBAH)
      let status = 'Ready';
      if (!isPack && stok <= 0) status = 'Sold Out';
      else if (isPack) {
        if (stok === 0) status = 'Habis';
        else if (stok < 15) status = 'Menipis';
        else status = 'Aman';
      }

      return {
        kodeItem,
        namaBarang: row.nama_barang || '',
        hargaModal: Number(row.harga_modal) || 0,
        stok,
        kategori: isPack ? 'Packaging' : 'Baju Thrifting',
        status,
        row: i + 2 
      };
    });

    // Filter pasukan Packaging dan Baju biar kepisah
    const packings = data.filter(item => item.kategori === 'Packaging');
    const bajus = data.filter(item => item.kategori !== 'Packaging');

    // Trik formasi: Baju duluan (dari lama ke baru), baru ditutup Packaging.
    // Karena di web lu datanya dibalik (reverse), otomatis Packaging mental ke paling atas,
    // dan Baju paling terakhir input langsung nempel di bawahnya persis!
    const sortedData = [...bajus, ...packings];
    
    return NextResponse.json({ success: true, data: sortedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ➕ POST: Tambah barang baru
export async function POST(req) {
  try {
    const data = await req.json();
    
    const { error } = await supabase
      .from('barang')
      .insert([{ 
        kode_item: data.kodeItem, 
        nama_barang: data.namaBarang, 
        harga_modal: Number(data.hargaModal), 
        stok: Number(data.stok) 
      }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✏️ PUT: Update barang
export async function PUT(req) {
  try {
    const data = await req.json();
    
    // Di Supabase, update data patokannya pakai kode_item, bukan nomor baris (row) lagi
    const { error } = await supabase
      .from('barang')
      .update({ 
        nama_barang: data.namaBarang, 
        harga_modal: Number(data.hargaModal), 
        stok: Number(data.stok) 
      })
      .eq('kode_item', data.kodeItem);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🗑️ DELETE: Hapus barang
export async function DELETE(req) {
  try {
    const data = await req.json();
    
    // Hapus data berdasarkan kode_item
    const { error } = await supabase
      .from('barang')
      .delete()
      .eq('kode_item', data.kodeItem);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}