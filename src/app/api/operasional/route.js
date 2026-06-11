import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// 🔄 GET: Ambil data pengeluaran dari Supabase
export async function GET() {
  try {
    // Tarik data dari tabel operasional, langsung urutkan dari yang terbaru
    const { data: dbData, error } = await supabase
      .from('operasional')
      .select('*')
      .order('id', { ascending: false }); // Otomatis menggantikan fungsi .reverse()

    if (error) throw error;

    // Mapping balik ke variabel yang dikenali frontend lu
    const formatData = dbData.map((row) => ({
      id: row.id, // Pakai ID otomatis dari Supabase
      tanggal: row.tanggal || '',
      keterangan: row.nama_pengeluaran || '', // Dijembatanin dari nama_pengeluaran
      kategori: 'Lain-lain', // Sesuai kodingan asli lu
      nominal: Number(row.biaya) || 0 // Dijembatanin dari biaya
    }));

    return NextResponse.json({ success: true, data: formatData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🚀 POST: Simpan data pengeluaran baru ke Supabase
export async function POST(request) {
  try {
    const data = await request.json();

    // Masukin data baru ke tabel operasional Supabase
    const { error } = await supabase
      .from('operasional')
      .insert([{
        tanggal: data.tanggal,
        nama_pengeluaran: data.keterangan, // Menerima data.keterangan dari web
        biaya: Number(data.nominal) // Menerima data.nominal dari web
      }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}