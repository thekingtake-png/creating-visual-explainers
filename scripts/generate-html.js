/**
 * generate-html.js
 * 営業データからダッシュボードHTMLを生成する
 */

const fs   = require('fs');
const path = require('path');

const OUTPUT_DIR  = path.join(__dirname, '..', 'output', 'weekly-report');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html');

/** 優先度バッジのスタイル */
const PRIORITY_BADGE = {
  '緊急': 'bg-red-100 text-red-700',
  '高':   'bg-orange-100 text-orange-700',
  '中':   'bg-yellow-100 text-yellow-700',
  '低':   'bg-gray-100 text-gray-600',
};

/** 優先度行のスタイル */
const PRIORITY_ROW = {
  '緊急': 'bg-red-50 hover:bg-red-100',
  '高':   'hover:bg-gray-50',
  '中':   'hover:bg-gray-50',
  '低':   'hover:bg-gray-50',
};

/** 金額フォーマット */
function formatAmount(yen) {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

/** 案件テーブルの行を生成 */
function buildPriorityRows(cases) {
  return cases.map(c => {
    const isUrgent = c.priority === '緊急';
    const rowClass = PRIORITY_ROW[c.priority] || 'hover:bg-gray-50';
    const tdFirst  = isUrgent
      ? 'px-4 py-3 border-l-4 border-red-500 pl-3'
      : 'px-4 py-3';

    return `
              <tr class="${rowClass} transition-colors">
                <td class="${tdFirst}">
                  <span class="${PRIORITY_BADGE[c.priority] || 'bg-gray-100 text-gray-600'} text-xs font-bold px-2 py-0.5 rounded-full">${c.priority}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-gray-800">${c.name}</p>
                  <p class="text-xs text-gray-500">${c.customer} 様</p>
                </td>
                <td class="px-4 py-3">
                  <div class="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">${c.assignee}</div>
                </td>
                <td class="px-4 py-3 font-semibold text-gray-800">${formatAmount(c.amount)}</td>
                <td class="px-4 py-3 text-xs text-gray-700">${c.action}</td>
                <td class="px-4 py-3">
                  <span class="${isUrgent ? 'text-red-600 font-bold' : 'text-gray-600 font-bold'} text-xs">${c.deadline}</span>
                </td>
              </tr>`;
  }).join('');
}

/** HTMLを生成して出力ファイルに書き込む */
function generateHtml(data) {
  const { week, period, summary, priorityCases, cautionCases } = data;

  const winRateClass = summary.winRate < summary.winRateGoal
    ? 'border-2 border-red-400'
    : 'border border-gray-100';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>営業週報 ${week} | Takezo Farm</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ["'Hiragino Kaku Gothic ProN'", "'Hiragino Sans'", 'Meiryo', 'sans-serif'] } } }
    }
  </script>
  <script src="https://unpkg.com/lucide@0.395.0/dist/umd/lucide.js"></script>
  <style>
    @media print {
      header { position: static !important; }
      .shadow-sm, .shadow-lg { box-shadow: none !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen font-sans">

  <!-- ヘッダー -->
  <header class="bg-green-800 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-screen-xl mx-auto px-6 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="bg-green-700 p-1.5 rounded-lg">
          <i data-lucide="tree-pine" class="w-5 h-5 text-green-300" aria-hidden="true"></i>
        </div>
        <div>
          <h1 class="text-base font-bold leading-tight">Takezo Farm</h1>
          <p class="text-green-300 text-xs">営業部 週報ダッシュボード</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-green-300 text-xs">集計期間</p>
          <p class="text-sm font-semibold">${period}</p>
        </div>
        <div class="hidden sm:flex items-center gap-1.5 bg-green-700 border border-green-600 rounded-lg px-2.5 py-1.5">
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-green-300" aria-hidden="true"></i>
          <span class="text-xs text-green-200">${week}</span>
        </div>
        <div class="hidden sm:flex items-center gap-1.5 bg-green-700 border border-green-600 rounded-lg px-2.5 py-1.5">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-green-300" aria-hidden="true"></i>
          <span class="text-xs text-green-200">自動生成</span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

    <!-- KPI カード -->
    <section aria-labelledby="section-summary">
      <div class="flex items-center gap-3 mb-4 border-l-4 border-green-600 pl-3">
        <i data-lucide="layout-dashboard" class="w-5 h-5 text-green-700" aria-hidden="true"></i>
        <h2 id="section-summary" class="text-lg font-bold text-gray-800">今週サマリー</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- 新規案件数 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <p class="text-sm font-semibold text-gray-600">新規案件数</p>
            <div class="bg-green-100 p-2 rounded-lg">
              <i data-lucide="plus-circle" class="w-4 h-4 text-green-700" aria-hidden="true"></i>
            </div>
          </div>
          <p class="text-3xl font-black text-gray-800">${summary.newCases}<span class="text-base font-normal text-gray-500 ml-0.5">件</span></p>
          <div class="mt-2 flex items-center gap-1 text-xs">
            <i data-lucide="trending-up" class="w-3 h-3 text-green-600" aria-hidden="true"></i>
            <span class="text-green-700 font-semibold">${summary.newCasesDiff >= 0 ? '+' : ''}${summary.newCasesDiff}件</span>
            <span class="text-gray-500">先週比</span>
          </div>
        </div>

        <!-- 商談中案件 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <p class="text-sm font-semibold text-gray-600">商談中案件</p>
            <div class="bg-green-100 p-2 rounded-lg">
              <i data-lucide="handshake" class="w-4 h-4 text-green-700" aria-hidden="true"></i>
            </div>
          </div>
          <p class="text-3xl font-black text-gray-800">${summary.negotiations}<span class="text-base font-normal text-gray-500 ml-0.5">件</span></p>
          <div class="mt-2 flex items-center gap-1 text-xs">
            <i data-lucide="trending-up" class="w-3 h-3 text-green-600" aria-hidden="true"></i>
            <span class="text-green-700 font-semibold">${summary.negotiationsDiff >= 0 ? '+' : ''}${summary.negotiationsDiff}件</span>
            <span class="text-gray-500">先週比</span>
          </div>
        </div>

        <!-- 今月受注額 -->
        <div class="bg-gradient-to-br from-green-700 to-green-900 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow text-white">
          <div class="flex items-start justify-between mb-3">
            <p class="text-sm font-semibold text-green-200">今月受注額</p>
            <div class="bg-green-600 p-2 rounded-lg">
              <i data-lucide="circle-dollar-sign" class="w-4 h-4 text-green-200" aria-hidden="true"></i>
            </div>
          </div>
          <p class="text-3xl font-black text-white">¥${summary.orderAmount}<span class="text-base font-normal text-green-300 ml-0.5">M</span></p>
          <div class="mt-3">
            <div class="flex justify-between text-xs text-green-300 mb-1.5">
              <span>月間目標: ¥${summary.orderAmountGoal}M</span>
              <span class="font-semibold text-white">${Math.round(summary.orderAmount / summary.orderAmountGoal * 100)}%</span>
            </div>
            <div class="bg-green-900 rounded-full h-3">
              <div class="bg-green-300 h-3 rounded-full" style="width: ${Math.min(100, Math.round(summary.orderAmount / summary.orderAmountGoal * 100))}%"></div>
            </div>
          </div>
        </div>

        <!-- 今週成約率 -->
        <div class="bg-white rounded-xl shadow-sm ${winRateClass} p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <p class="text-sm font-semibold text-gray-600">今週成約率</p>
            <div class="bg-red-100 p-2 rounded-lg">
              <i data-lucide="percent" class="w-4 h-4 text-red-600" aria-hidden="true"></i>
            </div>
          </div>
          <p class="text-3xl font-black text-red-600">${summary.winRate}<span class="text-base font-normal text-gray-500 ml-0.5">%</span></p>
          <div class="mt-2 flex items-center gap-1 text-xs">
            <i data-lucide="trending-down" class="w-3 h-3 text-red-500" aria-hidden="true"></i>
            <span class="text-red-600 font-semibold">${summary.winRateDiff}%</span>
            <span class="text-gray-500">先週比 ／ 目標${summary.winRateGoal}%</span>
          </div>
        </div>

      </div>
    </section>

    <!-- 優先対応案件 -->
    <section aria-labelledby="section-priority">
      <div class="flex items-center gap-3 mb-4 border-l-4 border-orange-500 pl-3">
        <i data-lucide="flame" class="w-5 h-5 text-orange-500" aria-hidden="true"></i>
        <h2 id="section-priority" class="text-lg font-bold text-gray-800">優先対応案件</h2>
        <span class="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">${priorityCases.length}件</span>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table class="w-full text-sm min-w-[640px]" aria-label="今週の優先対応案件一覧">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">優先度</th>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">案件名</th>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">担当</th>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">見積額</th>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">次回アクション</th>
              <th scope="col" class="text-left px-4 py-3 text-xs text-gray-600 font-semibold">期日</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${buildPriorityRows(priorityCases)}
          </tbody>
        </table>
      </div>
    </section>

  </main>

  <!-- フッター -->
  <footer class="mt-8 border-t border-gray-200 bg-white">
    <div class="max-w-screen-xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <i data-lucide="tree-pine" class="w-4 h-4 text-green-700" aria-hidden="true"></i>
        <span>Takezo Farm 営業部</span>
      </div>
      <div class="text-xs text-gray-400">
        自動生成: ${new Date().toLocaleString('ja-JP')}
      </div>
    </div>
  </footer>

  <script>
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  </script>
</body>
</html>`;

  // 出力ディレクトリがなければ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');
  console.log(`✅ HTML生成完了: ${OUTPUT_FILE}`);

  return OUTPUT_FILE;
}
module.exports = { generateHtml };

