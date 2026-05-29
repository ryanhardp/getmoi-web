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
      range: 'Penjualan!A2:I',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    const formatData = rows.map((row, index) => ({
      id: Date.now() + index,
      tanggal: row[0] || '',
      kodeItem: row[1] || '',
      namaBarang: row[2] || '',
      hargaModal: Number(row[3]) || 0,
      hargaJual: Number(row[4]) || 0,
      qty: Number(row[5]) || 1,
      profit: Number(row[7]) || 0
    }));

    return NextResponse.json({ success: true, data: formatData.reverse() }); 
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🚀 FUNGSI BARU: SIMPAN PENJUALAN + AUTO POTONG STOK GUDANG 🚀
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

    // 2. 🚀 EKSEKUSI POTONG STOK DI TAB 'Barang' 🚀
    if (data.keranjang && data.keranjang.length > 0) {
      // Baca dulu seluruh data gudang buat nyari baris ke berapa barangnya
      const resGudang = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Barang!A:D',
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      const rows = resGudang.data.values || [];

      // Rekap total qty yang dibeli per kode item
      const rekapBeli = {};
      data.keranjang.forEach(item => {
        rekapBeli[item.kodeItem] = (rekapBeli[item.kodeItem] || 0) + 1;
      });

      // Update stoknya ke Sheets
      for (const [kodeItem, qtyBeli] of Object.entries(rekapBeli)) {
        const rowIndex = rows.findIndex(r => r[0] === kodeItem);
        if (rowIndex !== -1) {
          const currentStok = Number(rows[rowIndex][3]) || 0;
          const newStok = Math.max(0, currentStok - qtyBeli); // Cegah minus
          
          await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: `Barang!D${rowIndex + 1}`, // Kolom D itu letak Stok
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[ newStok ]] }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Berhasil nulis & motong stok di Sheets!' });
  } catch (error) {
    console.error("Gagal nyatet penjualan:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}