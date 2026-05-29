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
      range: 'Operasional!A2:C', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return NextResponse.json({ success: true, data: [] });

    const formatData = rows.map((row, index) => {
      let nominalStr = row[2] ? row[2].toString().replace(/Rp/ig, '').replace(/,/g, '').split('.')[0].trim() : '0';
      return {
        id: Date.now() + index,
        tanggal: row[0] || '',
        keterangan: row[1] || '',
        kategori: 'Lain-lain', 
        nominal: Number(nominalStr) || 0
      };
    });

    return NextResponse.json({ success: true, data: formatData.reverse() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🚀 FUNGSI BARU: BUAT NULIS PENGELUARAN KE SHEETS
export async function POST(request) {
  try {
    const data = await request.json();
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Operasional!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[ data.tanggal, data.keterangan, data.nominal ]]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}