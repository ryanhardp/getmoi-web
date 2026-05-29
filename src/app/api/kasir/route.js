import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
    
    // Tarik data dari Tab Penjualan kolom A sampai F aja udah cukup
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Penjualan!A2:F', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return NextResponse.json({ success: true, data: [] });

    const formatData = rows.map((row, index) => {
      const getNum = (str) => Number((str || '0').replace(/Rp/ig, '').replace(/,/g, '').split('.')[0].trim());
      
      const modal = getNum(row[3]);
      const jual = getNum(row[4]);

      return {
        id: Date.now() + index,
        tanggal: row[0] || '',
        kodeItem: row[1] || '',
        namaBarang: row[2] || '',
        hargaModal: modal,
        hargaJual: jual,
        qty: Number(row[5]) || 1,
        // LOGIKA BARU: Profit dihitung otomatis oleh sistem, bodo amat sama tulisan di Excel
        profit: jual - modal
      };
    });

    return NextResponse.json({ success: true, data: formatData.reverse() }); 
  } catch (error) {
    console.error("Gagal narik data penjualan:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Disimpan di lokal' });
}