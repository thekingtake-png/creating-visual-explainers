/**
 * fetch-sheets.js
 * Google スプレッドシートから営業データを取得する
 *
 * スプレッドシートの構成（1行目がヘッダー）:
 * A: 案件名  B: 顧客名  C: 担当者  D: 見積額  E: 優先度
 * F: 次回アクション  G: 期日  H: ステータス
 */

const { google } = require('googleapis');

// ダミーデータ（--dry-run 時またはシートが未設定の場合に使用）
const DUMMY_DATA = {
  week: '第19週',
  period: '2026/05/04（月）〜 05/08（金）',
  summary: {
    newCases: 12,
    newCasesDiff: +3,
    negotiations: 28,
    negotiationsDiff: +5,
    orderAmount: 4.8,
    orderAmountDiff: +0.8,
    orderAmountGoal: 8.0,
    winRate: 42,
    winRateDiff: -3,
    winRateGoal: 45,
  },
  priorityCases: [
    { priority: '緊急', name: '山田邸 外構リフォーム', customer: '山田 太郎',  assignee: '田', amount: 1800000, action: '最終契約書送付', deadline: '05/09' },
    { priority: '高',   name: '佐藤様 駐車場工事',   customer: '佐藤 花子',  assignee: '鈴', amount: 950000,  action: '見積再提出',   deadline: '05/10' },
    { priority: '高',   name: '伊藤邸 植栽工事',     customer: '伊藤 次郎',  assignee: '田', amount: 620000,  action: 'プレゼン実施', deadline: '05/12' },
    { priority: '中',   name: '渡辺様 フェンス設置', customer: '渡辺 三郎',  assignee: '渡', amount: 280000,  action: 'TEL確認',     deadline: '05/14' },
    { priority: '中',   name: '小林邸 ガーデン工事', customer: '小林 幸子',  assignee: '鈴', amount: 1500000, action: '現地調査',     deadline: '05/15' },
    { priority: '低',   name: '松本様 外壁補修',     customer: '松本 健',    assignee: '田', amount: 150000,  action: '日程調整',     deadline: '05/19' },
    { priority: '低',   name: '加藤邸 照明設置',     customer: '加藤 美穂',  assignee: '渡', amount: 95000,   action: '日程調整',     deadline: '05/19' },
  ],
  cautionCases: [
    {
      type: '長期停滞',
      name: '高橋邸 ナチュラルガーデン',
      customer: '高橋 正夫',
      assignee: '田中',
      amount: 1200000,
      lastContact: '38日前',
      status: '検討中（返答なし）',
      advice: '今週中に再アプローチTELを実施。春のキャンペーン情報を案内して決断を促す。',
      action: 'TELアプローチを実施する',
    },
    {
      type: '競合検討中',
      name: '中村邸 カーポート＋外構',
      customer: '中村 義夫',
      assignee: '鈴木',
      amount: 780000,
      competitors: '他社2社と比較中',
      deadline: '05/12 まで',
      advice: '施工事例集と価格優位性資料を早急に準備し、05/10の訪問面談で差別化を訴求。',
      action: '訪問準備を開始する',
    },
    {
      type: '予算懸念',
      name: '木村邸 タイル張り工事',
      customer: '木村 春子',
      assignee: '渡辺',
      amount: 450000,
      budget: 300000,
      gap: 150000,
      advice: '2フェーズ分割施工案を提案。フェーズ1: ¥280,000プランを作成中。',
      action: '分割プランを作成する',
    },
  ],
};

/**
 * Google スプレッドシートからデータを取得する
 * @param {string} spreadsheetId  スプレッドシートのID
 * @param {string} credentialsJson サービスアカウントのJSONキー文字列
 * @returns {Promise<object>} ダッシュボード用データ
 */
async function fetchFromSheets(spreadsheetId, credentialsJson) {
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 「週報データ」シートのA1:H100を取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '案件データ!A1:H100',
  });

  const rows = response.data.values || [];
  if (rows.length < 2) throw new Error('スプレッドシートにデータがありません');

  // 1行目はヘッダーなのでスキップ
  const dataRows = rows.slice(1);

  // 優先度別に案件を分類
  const priorityCases = dataRows
    .filter(r => r[4] && ['緊急', '高', '中', '低'].includes(r[4]))
    .map(r => ({
      priority:  r[4] || '',
      name:      r[0] || '',
      customer:  r[1] || '',
      assignee:  (r[2] || '').slice(0, 1), // 頭文字のみ
      amount:    parseInt((r[3] || '0').replace(/[^\d]/g, ''), 10),
      action:    r[5] || '',
      deadline:  r[6] || '',
    }));

  // サマリー計算
  const totalAmount = priorityCases.reduce((s, c) => s + c.amount, 0);

  return {
    week:   '今週',
    period: `${new Date().toLocaleDateString('ja-JP')} 集計`,
    summary: {
      newCases:       priorityCases.filter(c => c.priority === '緊急' || c.priority === '高').length,
      newCasesDiff:   0,
      negotiations:   priorityCases.length,
      negotiationsDiff: 0,
      orderAmount:    Math.round(totalAmount / 100000) / 10,
      orderAmountDiff: 0,
      orderAmountGoal: 8.0,
      winRate:        45,
      winRateDiff:    0,
      winRateGoal:    45,
    },
    priorityCases,
    cautionCases: DUMMY_DATA.cautionCases, // 注意案件は別シートで管理推奨
  };
}

/**
 * メイン: 環境変数があれば実シート、なければダミーデータを返す
 */
async function getData(isDryRun = false) {
  const spreadsheetId  = process.env.SPREADSHEET_ID;
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (isDryRun || !spreadsheetId || !credentialsJson) {
    console.log('ℹ️  ダミーデータを使用します（実運用時は環境変数を設定してください）');
    return DUMMY_DATA;
  }

  console.log('📊 Google スプレッドシートからデータ取得中...');
  return await fetchFromSheets(spreadsheetId, credentialsJson);
}

module.exports = { getData };
