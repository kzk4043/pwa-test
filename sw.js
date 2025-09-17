// Service Worker for PWA Test Application
// このファイルは PWA の核となる Service Worker です
// ブラウザのバックグラウンドで動作し、オフライン機能やプッシュ通知などを制御します

// キャッシュ名とバージョン管理
// バージョンを変更することでキャッシュを更新できます
const CACHE_NAME = 'pwa-test-cache-v1';
const OFFLINE_URL = '/offline.html';

// 事前にキャッシュするリソース一覧
// これらのファイルは Service Worker インストール時にキャッシュされます
const CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/install.js',
  '/js/push.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// デバッグ用のログ関数
function log(message) {
  console.log(`[Service Worker] ${message}`);
}

// 1. Install Event - Service Worker インストール時に発火
// この段階で必要なリソースを事前にキャッシュします
self.addEventListener('install', (event) => {
  log('Service Worker インストール中...');
  
  // waitUntil で非同期処理の完了を待つ
  // この処理が完了するまで Service Worker のインストールは完了しません
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        log('キャッシュを開いて必要なリソースを追加中...');
        // addAll で複数のリソースを一括でキャッシュに追加
        return cache.addAll(CACHE_RESOURCES);
      })
      .then(() => {
        log('事前キャッシュ完了');
        // skipWaiting() で既存の Service Worker を即座に置き換え
        return self.skipWaiting();
      })
      .catch((error) => {
        log(`キャッシュエラー: ${error}`);
      })
  );
});

// 2. Activate Event - Service Worker がアクティブになった時に発火
// 古いキャッシュの削除などクリーンアップ処理を行います
self.addEventListener('activate', (event) => {
  log('Service Worker アクティベート中...');
  
  event.waitUntil(
    // 全てのキャッシュ名を取得
    caches.keys().then((cacheNames) => {
      // 古いキャッシュを削除する Promise の配列を作成
      const deletePromises = cacheNames
        .filter((cacheName) => {
          // 現在のキャッシュ名以外は削除対象
          return cacheName !== CACHE_NAME;
        })
        .map((cacheName) => {
          log(`古いキャッシュを削除: ${cacheName}`);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    })
    .then(() => {
      log('Service Worker アクティベート完了');
      // clients.claim() で既存のページも制御下に置く
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event - ネットワークリクエスト時に発火
// キャッシュ戦略を実装してオフライン対応を行います
self.addEventListener('fetch', (event) => {
  // GET リクエストのみ処理（POST などは通常キャッシュしない）
  if (event.request.method !== 'GET') {
    return;
  }

  // リクエストを横取りして独自の処理を実行
  event.respondWith(
    // Cache First 戦略: まずキャッシュを確認し、なければネットワークから取得
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          log(`キャッシュからレスポンス: ${event.request.url}`);
          return cachedResponse;
        }

        // キャッシュにない場合はネットワークから取得を試行
        log(`ネットワークから取得: ${event.request.url}`);
        return fetch(event.request)
          .then((response) => {
            // レスポンスが正常でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            // レスポンスは一度しか読めないため、クローンが必要
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                log(`キャッシュに追加: ${event.request.url}`);
              });

            return response;
          });
      })
      .catch(() => {
        // ネットワークもキャッシュも失敗した場合
        log(`オフライン: ${event.request.url}`);
        
        // HTML リクエストの場合はオフラインページを返す
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
        
        // その他のリソースの場合はエラーを返す
        return new Response('オフライン', {
          status: 408,
          statusText: 'Offline'
        });
      })
  );
});

// 4. Push Event - プッシュ通知受信時に発火
self.addEventListener('push', (event) => {
  log('プッシュ通知を受信');
  
  let title = 'PWAテスト';
  let body = 'プッシュ通知のテストです';
  let icon = '/icons/icon-192x192.png';
  let badge = '/icons/icon-72x72.png';
  
  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      icon = data.icon || icon;
      log(`プッシュデータ: ${JSON.stringify(data)}`);
    } catch (e) {
      log(`プッシュデータ解析エラー: ${e}`);
      body = event.data.text() || body;
    }
  }
  
  // 通知オプション
  const options = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };
  
  // 通知を表示
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        log('通知表示完了');
      })
      .catch((error) => {
        log(`通知表示エラー: ${error}`);
      })
  );
});

// 5. Notification Click Event - 通知クリック時に発火
self.addEventListener('notificationclick', (event) => {
  log(`通知クリック: ${event.action}`);
  
  // 通知を閉じる
  event.notification.close();
  
  // アクションに応じて処理を分岐
  if (event.action === 'close') {
    // 何もしない
    return;
  }
  
  // アプリを開く処理
  event.waitUntil(
    // 既に開いているタブがあるか確認
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // 既に開いているタブがあればそれをフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          log('既存のタブをフォーカス');
          return client.focus();
        }
      }
      
      // 開いているタブがなければ新しいウィンドウを開く
      if (clients.openWindow) {
        log('新しいウィンドウを開く');
        return clients.openWindow('/');
      }
    })
  );
});

// 6. Background Sync Event - バックグラウンド同期時に発火
self.addEventListener('sync', (event) => {
  log(`バックグラウンド同期: ${event.tag}`);
  
  if (event.tag === 'test-sync') {
    event.waitUntil(
      // 同期処理の実行
      performSync()
        .then(() => {
          log('バックグラウンド同期完了');
        })
        .catch((error) => {
          log(`バックグラウンド同期エラー: ${error}`);
        })
    );
  }
});

// 同期処理の実装例
async function performSync() {
  try {
    // 実際のアプリケーションでは、ここで以下のような処理を行います：
    // - オフライン時に蓄積されたデータの送信
    // - サーバーからの最新データの取得
    // - ローカルデータベースの更新
    
    log('同期処理を実行中...');
    
    // 例: 簡単な API 呼び出しのシミュレーション
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    log('同期処理完了');
    return true;
  } catch (error) {
    log(`同期処理エラー: ${error}`);
    throw error;
  }
}

// Service Worker の更新通知
self.addEventListener('message', (event) => {
  log(`メッセージ受信: ${event.data.type}`);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log('Service Worker 更新をスキップ');
    self.skipWaiting();
  }
});

log('Service Worker ファイル読み込み完了');