import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// ⬇️ MESIN BUAT NARIK DATA DARI SHEETS (TOMBOL BIRU) ⬇️
export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Baca data dari Tab bernama "Barang", mulai dari baris ke-2 (A2) sampai D
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Barang!A2:D', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Ngerapihin data dari Excel biar masuk ke sistem Web lu
    const formatData = rows.map(row => {
      let hargaStr = row[2] ? row[2].toString() : '0';
      // Hapus tulisan Rp, hapus koma ribuan, dan buang angka di belakang titik
      hargaStr = hargaStr.replace(/Rp/ig, '').replace(/,/g, '').split('.')[0].trim();
      
      return {
        kodeItem: row[0] || '',
        namaBarang: row[1] || '',
        hargaModal: Number(hargaStr) || 0,
        stok: Number(row[3]) || 0,
        kategori: (row[0] && row[0].startsWith('P')) ? 'Packaging' : 'Baju Thrifting',
        status: Number(row[3]) > 0 ? ((row[0] && row[0].startsWith('P')) ? 'Aman' : 'Ready') : ((row[0] && row[0].startsWith('P')) ? 'Habis' : 'Sold Out')
      };
    });

    return NextResponse.json({ success: true, data: formatData });
  } catch (error) {
    console.error("Gagal narik data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ⬇️ MESIN BUAT NYIMPEN DATA SEMENTARA BIAR GAK ERROR ⬇️
export async function POST() {
  return NextResponse.json({ success: true, message: 'Disimpan di lokal' });
}