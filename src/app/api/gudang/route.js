import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const getAuth = () => new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// GET: Ambil daftar barang dari Google Sheets
export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Barang!A2:D', 
    });

    const rows = response.data.values || [];
    const data = rows.map((row, index) => ({
      kodeItem: row[0],
      namaBarang: row[1],
      hargaModal: Number(row[2]) || 0,
      stok: Number(row[3]) || 0,
      id: index + 2 // Simpan row index buat update nanti
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Simpan barang baru ke Google Sheets
export async function POST(request) {
  try {
    const data = await request.json();
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