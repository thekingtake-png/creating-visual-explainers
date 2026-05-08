/**
 * run.js
 * 営業週報の自動生成・デプロイ・LINE通知を一括実行するメインスクリプト
 *
 * 使い方:
 *   node scripts/run.js           # 本番実行（環境変数必須）
 *   node scripts/run.js --dry-run # テスト実行（ダミーデータ・送信なし）
 */

const { getData }      = require('./fetch-sheets');
const { generateHtml } = require('./generate-html');
const { notifyLine }   = require('./notify-line');

const isDryRun  = process.argv.includes('--dry-run');
const REPORT_URL = process.env.REPORT_URL || 'https://YOUR_GITHUB_USERNAME.github.io/creating-visual-explainers/weekly-report/';

async function main() {
  console.log(`\n🚀 営業週報 自動生成システム 開始 ${isDryRun ? '【ドライラン】' : ''}`);
  console.log('================================================\n');

  try {
    // Step 1: データ取得
    console.log('Step 1/3: データ取得');
    const data = await getData(isDryRun);
    console.log(`  → 案件数: ${data.priorityCases.length}件\n`);

    // Step 2: HTML生成
    console.log('Step 2/3: HTMLダッシュボード生成');
    const outputFile = generateHtml(data);
    console.log(`  → ${outputFile}\n`);

    // Step 3: LINE通知（GitHub Actionsでのデプロイ後に実行）
    console.log('Step 3/3: LINE通知送信');
    await notifyLine(data, REPORT_URL, isDryRun);
    console.log('');

    console.log('================================================');
    console.log('✅ 完了！\n');

    if (isDryRun) {
      console.log('💡 本番実行のために必要な環境変数:');
      console.log('   SPREADSHEET_ID         Google スプレッドシートのID');
      console.log('   GOOGLE_CREDENTIALS_JSON サービスアカウントのJSONキー');
      console.log('   LINE_CHANNEL_TOKEN      LINEチャンネルアクセストークン');
      console.log('   LINE_USER_IDS           通知先ユーザーID（カンマ区切り）');
      console.log('   REPORT_URL              デプロイ先URL\n');
    }

  } catch (err) {
    console.error('\n❌ エラーが発生しました:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
