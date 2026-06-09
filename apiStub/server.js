const http = require('http');

/**
 * 外部認可システムスタブサーバー
 * 
 * 目的:
 * - InternalAuthController の /auth/validate から呼び出される外部認可チェックAPIのスタブ
 * - 本番環境では実際の外部システムAPIに置き換えられる
 * 
 * エンドポイント:
 * - POST /api/authorization/check - 認可チェック
 * 
 * 応答形式:
 * - 成功: { "authorized": true, "message": "認可成功" }
 * - 失敗: { "authorized": false, "message": "エラーメッセージ" }
 * 
 * 動作:
 * - リクエスト受信後、1秒間待機（本番の外部API呼び出しをシミュレート）
 * - 常に認可成功を返す（テスト用）
 */

const PORT = 3000;
const HOST = 'localhost';

const server = http.createServer((req, res) => {
  // CORS ヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS リクエスト（プリフライト）対応
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/authorization/check - 認可チェック
  if (req.method === 'POST' && req.url === '/api/authorization/check') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // リクエストボディをパース
        const request = JSON.parse(body);
        const userId = request.userId;

        console.log(`[認可チェック] リクエスト受信: userId=${userId}`);

        // userId のバリデーション
        if (!userId || userId.trim() === '') {
          console.warn('[認可チェック] userId が空です');
          sendResponse(res, 400, {
            authorized: false,
            message: 'userId は必須です'
          });
          return;
        }

        // 外部API呼び出しをシミュレート（1秒待機）
        console.log(`[認可チェック] 外部API呼び出し開始: userId=${userId}`);
        
        setTimeout(() => {
          console.log(`[認可チェック] 外部API呼び出し完了: userId=${userId}`);
          console.log(`[認可チェック] 認可成功: userId=${userId}`);

          // 常に認可成功を返す（テスト用）
          sendResponse(res, 200, {
            authorized: true,
            message: '認可成功',
            userId: userId,
            permissions: ['READ', 'WRITE', 'ADMIN'] // テスト用権限
          });
        }, 1000); // 1秒待機

      } catch (error) {
        console.error('[認可チェック] リクエストパースエラー:', error.message);
        sendResponse(res, 400, {
          authorized: false,
          message: 'リクエスト形式が無効です'
        });
      }
    });

    return;
  }

  // ヘルスチェックエンドポイント
  if (req.method === 'GET' && req.url === '/health') {
    sendResponse(res, 200, {
      status: 'healthy',
      service: 'external-authorization-stub',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // 404 - エンドポイントが見つからない
  sendResponse(res, 404, {
    error: 'Not Found',
    message: `エンドポイント ${req.method} ${req.url} は存在しません`
  });
});

/**
 * HTTP レスポンスを送信
 */
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

// サーバー起動
server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('外部認可システムスタブサーバー 起動完了');
  console.log('='.repeat(60));
  console.log(`URL: http://${HOST}:${PORT}`);
  console.log(`ヘルスチェック: http://${HOST}:${PORT}/health`);
  console.log(`認可チェック: POST http://${HOST}:${PORT}/api/authorization/check`);
  console.log('='.repeat(60));
  console.log('');
  console.log('テストコマンド:');
  console.log(`curl -X POST http://${HOST}:${PORT}/api/authorization/check \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"userId": "test-user-123"}'`);
  console.log('');
});

// シャットダウン処理
process.on('SIGINT', () => {
  console.log('\nサーバーをシャットダウンしています...');
  server.close(() => {
    console.log('サーバーが正常にシャットダウンしました');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nサーバーをシャットダウンしています...');
  server.close(() => {
    console.log('サーバーが正常にシャットダウンしました');
    process.exit(0);
  });
});
