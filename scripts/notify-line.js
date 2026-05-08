/**
 * notify-line.js
 * LINE Messaging API で担当者に週報を通知する
 *
 * 事前準備:
 *   - LINE Developers でチャンネル作成
 *   - チャンネルアクセストークンを環境変数 LINE_CHANNEL_TOKEN に設定
 *   - 通知先ユーザーIDを環境変数 LINE_USER_IDS に「,」区切りで設定
 *     例: U1234567890abcdef,Uabcdef1234567890
 */

const axios = require('axios');

const LINE_API = 'https://api.line.me/v2/bot/message/multicast';

/**
 * 通知テキストを組み立てる
 */
function buildMessage(data, reportUrl) {
  const { week, summary, priorityCases } = data;

  const urgentCases = priorityCases.filter(c => c.priority === '緊急');
  const urgentText  = urgentCases.length > 0
    ? `\n🚨 緊急対応: ${urgentCases.map(c => c.name).join('、')}`
    : '';

  const winRateIcon = summary.winRate >= summary.winRateGoal ? '✅' : '⚠️';

  return [
    `📊 営業週報 ${week} が届きました`,
    '',
    `━━━━━━━━━━━━━━━`,
    `📌 今週のハイライト`,
    `━━━━━━━━━━━━━━━`,
    `🆕 新規案件数: ${summary.newCases}件（${summary.newCasesDiff >= 0 ? '+' : ''}${summary.newCasesDiff}件）`,
    `🤝 商談中: ${summary.negotiations}件`,
    `💰 受注額: ¥${summary.orderAmount}M（目標${Math.round(summary.orderAmount / summary.orderAmountGoal * 100)}%）`,
    `${winRateIcon} 成約率: ${summary.winRate}%（目標${summary.winRateGoal}%）`,
    urgentText,
    '',
    `📋 詳細はこちら`,
    reportUrl || '（URLは設定後に表示されます）',
  ].filter(line => line !== null).join('\n');
}

/**
 * LINE に送信する
 * @param {string[]} userIds   送信先ユーザーIDの配列
 * @param {string}   token     チャンネルアクセストークン
 * @param {string}   text      送信テキスト
 */
async function sendLine(userIds, token, text) {
  const response = await axios.post(
    LINE_API,
    {
      to:       userIds,
      messages: [{ type: 'text', text }],
    },
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`LINE API エラー: ${response.status} ${JSON.stringify(response.data)}`);
  }
}

/**
 * メイン: 環境変数が設定されていれば送信、なければログのみ
 * @param {object} data      営業データ
 * @param {string} reportUrl デプロイ済みダッシュボードのURL
 */
async function notifyLine(data, reportUrl, isDryRun = false) {
  const token   = process.env.LINE_CHANNEL_TOKEN;
  const userIds = (process.env.LINE_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

  const message = buildMessage(data, reportUrl);

  if (isDryRun || !token || userIds.length === 0) {
    console.log('ℹ️  LINE送信スキップ（ドライランまたは環境変数未設定）');
    console.log('─── 送信予定メッセージ ───');
    console.log(message);
    console.log('─────────────────────────');
    return;
  }

  console.log(`📱 LINE通知送信中... (${userIds.length}名)`);
  await sendLine(userIds, token, message);
  console.log('✅ LINE通知完了');
}
module.exports = { notifyLine };

