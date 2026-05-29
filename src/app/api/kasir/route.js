import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const getAuth = () => new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
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
        profit: jual - modal
      };
    });

    return NextResponse.json({ success: true, data: formatData.reverse() }); 
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🚀 FUNGSI BARU: BUAT NULIS KE GOOGLE SHEETS 🚀
export async function POST(request) {
  try {
    const data = await request.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    // 1. Tulis Transaksi Baru ke Tab 'Penjualan'
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Penjualan!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          data.tanggal,
          data.kodeItem,
          data.namaBarang,
          data.hargaModal,
          data.hargaJual,
          data.qty,
          data.hargaJual, // Total Penjualan
          data.profit,
          data.profitPersen
        ]]
      }
    });

    return NextResponse.json({ success: true, message: 'Berhasil nulis ke Sheets!' });
  } catch (error) {
    console.error("Gagal nyatet penjualan:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}