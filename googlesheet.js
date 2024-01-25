const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');

async function createNewSheet() {
  // Authenticate with the Google Sheets API
  const auth = await authenticate({
    keyfilePath: 'credentials.json', // Replace with your credentials file path
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Create a new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    resource: {
      properties: {
        title: 'SlipCheckBB',
      },
    },
  });

  // Get the ID of the created spreadsheet
  const ssIduser = spreadsheet.data.spreadsheetId;

  // Share the spreadsheet with anyone who has the link
  await drive.permissions.create({
    resource: {
      type: 'anyone',
      role: 'writer',
    },
    fileId: ssIduser,
  });

  // Get the first sheet of the spreadsheet
  const sheet = spreadsheet.data.sheets[0];

  // Add header row
  const headerRow = ['วันที่ ว/ด/ป', 'เวลาโอนเงิน', 'ผู้ส่ง', 'ผู้รับ', 'จำนวนเงิน', 'เลขที่รายการ', 'หมายเหตุ', 'สลิปที่อัปโหลด'];
  await sheets.spreadsheets.values.append({
    spreadsheetId: ssIduser,
    range: 'data1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [headerRow],
    },
  });

  // Set column widths
  const columnWidths = [150, 150, 300, 300, 150, 200, 300, 700];
  for (let i = 0; i < columnWidths.length; i++) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ssIduser,
      resource: {
        requests: [
          {
            updateDimensionProperties: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'COLUMNS',
                startIndex: i,
                endIndex: i + 1,
              },
              properties: {
                pixelSize: columnWidths[i],
              },
              fields: 'pixelSize',
            },
          },
        ],
      },
    });
  }

  return ssIduser;
}

export default createNewSheet;
