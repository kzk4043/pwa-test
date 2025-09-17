# Service Worker解説

## Service Workerとは

Service Workerは、ウェブページとは独立してブラウザのバックグラウンドで動作するスクリプトです。PWAの核となる技術で、オフライン機能、プッシュ通知、バックグラウンド同期などを可能にします。

## Service Workerの特徴

### 1. プロキシとしての役割
- ネットワークリクエストを横取りして制御
- キャッシュ戦略の実装が可能
- オフライン時の代替レスポンス提供

### 2. イベントドリブン
- インストール、アクティベート、フェッチなどのイベントに反応
- プッシュ通知やバックグラウンド同期イベントを処理

### 3. 独立したスコープ
- メインスレッドと分離されて動作
- DOM直接操作は不可
- postMessage APIでメインスレッドと通信

### 4. セキュリティ制約
- HTTPS必須（localhostは例外）
- 同一オリジン制約

## Service Workerのライフサイクル

### 1. 登録（Registration）
```javascript
// メインスレッド（app.js）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker 登録成功:', registration);
    })
    .catch(error => {
      console.log('Service Worker 登録失敗:', error);
    });
}
```

### 2. インストール（Install）
```javascript
// Service Worker（sw.js）
self.addEventListener('install', event => {
  console.log('Service Worker インストール中');
  
  event.waitUntil(
    // 必要なリソースの事前キャッシュ
    caches.open('cache-v1')
      .then(cache => {
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css',
          '/app.js'
        ]);
      })
  );
});
```

### 3. アクティベート（Activate）
```javascript
self.addEventListener('activate', event => {
  console.log('Service Worker アクティベート中');
  
  event.waitUntil(
    // 古いキャッシュの削除
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== 'cache-v1') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### 4. フェッチ（Fetch）
```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにある場合は返す
        if (response) {
          return response;
        }
        // ない場合はネットワークから取得
        return fetch(event.request);
      })
  );
});
```

## キャッシュ戦略

### 1. Cache First（キャッシュ優先）
```javascript
// 静的リソース（CSS、JS、画像）に適用
self.addEventListener('fetch', event => {
  if (event.request.destination === 'style' || 
      event.request.destination === 'script' ||
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // キャッシュにあればそれを返す
          return response || fetch(event.request)
            .then(fetchResponse => {
              // キャッシュに保存
              const responseClone = fetchResponse.clone();
              caches.open('static-v1').then(cache => {
                cache.put(event.request, responseClone);
              });
              return fetchResponse;
            });
        })
    );
  }
});
```

**メリット**: 高速レスポンス、オフライン対応  
**デメリット**: 古い情報の可能性  
**適用対象**: CSS、JavaScript、画像、フォントなど

### 2. Network First（ネットワーク優先）  
```javascript
// 動的コンテンツ（API、HTML）に適用
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 成功時はキャッシュに保存
          const responseClone = response.clone();
          caches.open('dynamic-v1').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // ネットワーク失敗時はキャッシュから返す
          return caches.match(event.request);
        })
    );
  }
});
```

**メリット**: 常に最新情報  
**デメリット**: ネットワーク遅延、オフライン時問題  
**適用対象**: API、動的HTML、ユーザーデータ

### 3. Stale While Revalidate（古い情報で応答しつつ更新）
```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // バックグラウンドで更新
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // キャッシュを更新
            caches.open('swrevalidate-v1').then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          });

        // キャッシュがあればすぐ返す、なければ待つ
        return cachedResponse || fetchPromise;
      })
  );
});
```

**メリット**: 高速 + 最新性のバランス  
**デメリット**: 複雑性増加  
**適用対象**: 頻繁に更新されるコンテンツ

### 4. Network Only（ネットワークのみ）
```javascript
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST') {
    // POSTリクエストはネットワークのみ
    event.respondWith(fetch(event.request));
  }
});
```

**メリット**: シンプル、常に最新  
**デメリット**: オフライン時利用不可  
**適用対象**: POST/PUT/DELETE、認証が必要なAPI

### 5. Cache Only（キャッシュのみ）
```javascript
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/offline.html')) {
    event.respondWith(caches.match(event.request));
  }
});
```

**メリット**: 高速、確実  
**デメリット**: 更新されない  
**適用対象**: オフラインページ、固定リソース

## Service Workerのデバッグ方法

### 1. Chrome DevTools
```javascript
// Application タブ > Service Workers
// - 現在の状態確認
// - 強制更新
// - 登録解除
// - Offline シミュレーション
```

### 2. Console ログ活用
```javascript
self.addEventListener('install', event => {
  console.log('[SW] Install Event:', event);
});

self.addEventListener('fetch', event => {
  console.log('[SW] Fetch:', event.request.url);
});
```

### 3. キャッシュ内容確認
```javascript
// Cache Storage の確認
caches.keys().then(cacheNames => {
  console.log('Available caches:', cacheNames);
  
  cacheNames.forEach(cacheName => {
    caches.open(cacheName).then(cache => {
      cache.keys().then(requests => {
        console.log(`Cache ${cacheName}:`, 
          requests.map(req => req.url));
      });
    });
  });
});
```

### 4. エラーハンドリング
```javascript
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});
```

## 本プロジェクトのService Worker実装解説

### ファイル構成
```
sw.js              # Service Worker メインファイル
├── install        # インストールイベント処理
├── activate       # アクティベートイベント処理  
├── fetch          # フェッチイベント処理
├── push           # プッシュ通知受信
├── notificationclick # 通知クリック処理
└── sync           # バックグラウンド同期
```

### キャッシュ戦略の実装

#### 1. 事前キャッシュ（Install時）
```javascript
const CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/install.js', 
  '/js/push.js'
];

// インストール時に重要なリソースをキャッシュ
event.waitUntil(
  caches.open(CACHE_NAME).then(cache => {
    return cache.addAll(CACHE_RESOURCES);
  })
);
```

#### 2. 動的キャッシュ（Fetch時）
```javascript
// リクエストごとにキャッシュ戦略を決定
event.respondWith(
  caches.match(event.request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse; // Cache First
      }
      
      return fetch(event.request)
        .then(response => {
          // 正常なレスポンスのみキャッシュ
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
    })
    .catch(() => {
      // オフライン時の代替ページ
      if (event.request.destination === 'document') {
        return caches.match('/offline.html');
      }
    })
);
```

### プッシュ通知の実装
```javascript
self.addEventListener('push', event => {
  let notificationData = {
    title: 'PWAテスト',
    body: 'プッシュ通知のテストです',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    const data = event.data.json();
    notificationData = { ...notificationData, ...data };
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData
    )
  );
});
```

## Service Workerのベストプラクティス

### 1. キャッシュバージョン管理
```javascript
const CACHE_NAME = 'pwa-cache-v1';

// バージョンアップ時は番号を変更
// const CACHE_NAME = 'pwa-cache-v2';
```

### 2. 適切なキャッシュ期間
```javascript
// 長期キャッシュ: 静的リソース
// 短期キャッシュ: 動的コンテンツ
// キャッシュなし: 個人情報、認証が必要なデータ
```

### 3. エラーハンドリングの充実
```javascript
.catch(error => {
  console.error('Service Worker error:', error);
  // ユーザーフレンドリーなフォールバック
  return new Response('オフラインです', {
    status: 408,
    statusText: 'Request Timeout'
  });
});
```

### 4. メモリリーク対策
```javascript
// 大きなオブジェクトの適切な破棄
// イベントリスナーの適切な削除
// キャッシュサイズの制限
```

## トラブルシューティング

### よくある問題と解決法

1. **Service Worker が更新されない**
   - ブラウザキャッシュをクリア
   - `skipWaiting()` の使用検討
   - バージョン番号の変更

2. **キャッシュが効かない**  
   - リクエストURLの完全一致確認
   - HTTPSでの動作確認
   - Cache-Control ヘッダーの確認

3. **オフライン時にエラー**
   - オフラインページの事前キャッシュ確認
   - catch句でのフォールバック実装
   - 必須リソースのキャッシュ確認

4. **プッシュ通知が来ない**
   - 通知許可の確認
   - Service Worker の登録状態確認
   - VAPIDキーの設定確認

Service Workerは強力ですが複雑な技術です。段階的に機能を追加し、十分なテストを行うことが重要です。