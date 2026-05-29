import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const getAuth = () => new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// GET: Sedot data dari Sheets
export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SPREADSHEET_ID, range: 'Barang!A2:D' });
    const rows = res.data.values || [];
    const data = rows.map((row, i) => ({
      kodeItem: row[0] || '',
      namaBarang: row[1] || '',
      hargaModal: Number(row[2]) || 0,
      stok: Number(row[3]) || 0,
      row: i + 2 // Nyimpen nomor baris di excel buat dipake pas Edit/Hapus
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah barang baru
export async function POST(req) {
  try {
    const data = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Barang!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[ data.kodeItem, data.namaBarang, data.hargaModal, data.stok ]] }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update barang (Edit)
export async function PUT(req) {
  try {
    const data = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Barang!A${data.row}:D${data.row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[ data.kodeItem, data.namaBarang, data.hargaModal, data.stok ]] }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus barang
export async function DELETE(req) {
  try {
    const { row } = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    
    // Cari ID tab 'Barang' biar hapusnya akurat
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    const sheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Barang');
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID,
      requestBody: {
        requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } }]
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}