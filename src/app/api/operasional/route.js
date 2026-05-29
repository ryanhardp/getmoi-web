import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// ⬇️ MESIN BUAT NARIK DATA DARI TAB "Operasional" ⬇️
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
    
    // Baca data dari Tab "Operasional" kolom A sampai C
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Operasional!A2:C', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Ngerapihin data biar masuk ke sistem Web lu
    const formatData = rows.map((row, index) => {
      let nominalStr = row[2] ? row[2].toString() : '0';
      // Hapus tulisan Rp, koma, dan ambil angka depannya aja
      nominalStr = nominalStr.replace(/Rp/ig, '').replace(/,/g, '').split('.')[0].trim();
      
      return {
        id: Date.now() + index, // Bikin ID unik per baris
        tanggal: row[0] || '',
        keterangan: row[1] || '',
        kategori: 'Lain-lain', // Karena di Excel lu ga ada kategori, kita default ke Lain-lain
        nominal: Number(nominalStr) || 0
      };
    });

    return NextResponse.json({ success: true, data: formatData });
  } catch (error) {
    console.error("Gagal narik data operasional:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ⬇️ MESIN BUAT NYIMPEN DATA SEMENTARA ⬇️
export async function POST() {
  return NextResponse.json({ success: true, message: 'Disimpan di lokal' });
}