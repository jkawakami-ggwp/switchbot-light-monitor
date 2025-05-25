import { google } from 'googleapis';
import axios from 'axios';

export const handler = async () => {
  try {
    // 環境変数から値を取得
    const switchbotToken = process.env.SWITCHBOT_TOKEN!;
    const deviceId = process.env.SWITCHBOT_DEVICE_ID!;
    const sheetId = process.env.GOOGLE_SHEET_ID!;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;

    const serviceAccount = JSON.parse(serviceAccountJson);

    // SwitchBot APIでライト状態取得
    const res = await axios.get(`https://api.switch-bot.com/v1.1/devices/${deviceId}/status`, {
      headers: {
        'Authorization': switchbotToken,
        'Content-Type': 'application/json; charset=utf8',
      },
    });

    const lightState = res.data.body.power; // "on" or "off"
    const status = lightState === 'on' ? 'awake' : 'asleep';
    
    // 日本時間に変換し、yyyy-MM-dd hh:mm形式にフォーマット
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9時間
    const year = jstNow.getUTCFullYear();
    const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstNow.getUTCDate()).padStart(2, '0');
    const hours = String(jstNow.getUTCHours()).padStart(2, '0');
    const minutes = String(jstNow.getUTCMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

    // Google Sheets 認証
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      undefined,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    await jwtClient.authorize();

    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    // スプレッドシートに追記
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'logs!A:B',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[formattedDate, status]],
      },
    });

    console.log(`書き込み完了: ${formattedDate} - ${status}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ time: formattedDate, status }),
    };
  } catch (error) {
    const err = error as Error;
    console.error('エラー:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};