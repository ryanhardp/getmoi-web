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
    
    // 🔑 KUNCI FIX: UNFORMATTED_VALUE biar dapet angka murni (misal 16600), bukan teks "Rp 16.600"
    const res = await sheets.spreadsheets.values.get({ 
      spreadsheetId: process.env.SPREADSHEET_ID, 
      range: 'Barang!A2:D',
      valueRenderOption: 'UNFORMATTED_VALUE' 
    });
    
    const rows = res.data.values || [];
    const data = rows.map((row, i) => {
      const kodeItem = String(row[0] || '');
      const isPack = kodeItem.startsWith('P');
      const stok = Number(row[3]) || 0;
      
      // Generate status anti-blank langsung dari server
      let status = 'Ready';
      if (!isPack && stok <= 0) status = 'Sold Out';
      else if (isPack) {
        if (stok === 0) status = 'Habis';
        else if (stok < 15) status = 'Menipis';
        else status = 'Aman';
      }

      return {
        kodeItem,
        namaBarang: row[1] || '',
        hargaModal: Number(row[2]) || 0,
        stok,
        kategori: isPack ? 'Packaging' : 'Baju Thrifting',
        status,
        row: i + 2
      };
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await sheets.spreadsheets.values.append({ spreadsheetId: process.env.SPREADSHEET_ID, range: 'Barang!A:D', valueInputOption: 'USER_ENTERED', requestBody: { values: [[ data.kodeItem, data.namaBarang, data.hargaModal, data.stok ]] } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await sheets.spreadsheets.values.update({ spreadsheetId: process.env.SPREADSHEET_ID, range: `Barang!A${data.row}:D${data.row}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[ data.kodeItem, data.namaBarang, data.hargaModal, data.stok ]] } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { row } = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    
    // Cari ID tab 'Barang' biar hapusnya presisi
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    const sheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Barang');
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({ spreadsheetId: process.env.SPREADSHEET_ID, requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } }] } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}