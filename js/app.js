// PWAテストアプリケーションのメインファイル
// このファイルはアプリケーションの初期化と全体的な状態管理を行います

// デバッグ用のログ関数
function log(message) {
  console.log(`[App] ${message}`);
}

// アプリケーションの状態管理
const AppState = {
  serviceWorkerReady: false,
  isOnline: navigator.onLine,
  installPromptEvent: null
};

// DOM要素の参照を保持
const elements = {};

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', function() {
  log('アプリケーション初期化開始');
  
  // DOM要素を取得
  initializeElements();
  
  // Service Workerを登録
  registerServiceWorker();
  
  // イベントリスナーを設定
  setupEventListeners();
  
  // 初期状態を更新
  updateUI();
  
  log('アプリケーション初期化完了');
});

// DOM要素の初期化
function initializeElements() {
  // デバッグ情報用の要素
  elements.swStatus = document.getElementById('swStatus');
  elements.onlineStatus = document.getElementById('onlineStatus');
  elements.installCheckStatus = document.getElementById('installCheckStatus');
  
  // キャッシュ関連の要素
  elements.cacheBtn = document.getElementById('cacheBtn');
  elements.cacheStatus = document.getElementById('cacheStatus');
  
  // バックグラウンド同期関連の要素
  elements.syncBtn = document.getElementById('syncBtn');
  elements.syncStatus = document.getElementById('syncStatus');
  
  log('DOM要素の取得完了');
}

// Service Worker の登録
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      log('Service Worker 登録中...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      log(`Service Worker 登録成功: ${registration.scope}`);
      AppState.serviceWorkerReady = true;
      
      // Service Worker の状態変化を監視
      setupServiceWorkerListeners(registration);
      
      // 既存の Service Worker がある場合の処理
      if (registration.active) {
        log('アクティブな Service Worker を検出');
      }
      
      // インストール待ちの Service Worker がある場合
      if (registration.waiting) {
        log('待機中の Service Worker を検出');
        showUpdateAvailable();
      }
      
      // 新しい Service Worker がインストール中の場合
      if (registration.installing) {
        log('インストール中の Service Worker を検出');
        trackInstalling(registration.installing);
      }
      
      return registration;
      
    } catch (error) {
      log(`Service Worker 登録エラー: ${error}`);
      AppState.serviceWorkerReady = false;
      return null;
    }
  } else {
    log('Service Worker はこのブラウザでサポートされていません');
    AppState.serviceWorkerReady = false;
    return null;
  }
}

// Service Worker のイベントリスナー設定
function setupServiceWorkerListeners(registration) {
  // アップデートが見つかった場合
  registration.addEventListener('updatefound', () => {
    log('Service Worker のアップデートを検出');
    const newWorker = registration.installing;
    trackInstalling(newWorker);
  });
  
  // Service Worker の状態変化を監視
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    log('Service Worker が更新されました');
    refreshing = true;
    window.location.reload();
  });
}

// インストール中の Service Worker を追跡
function trackInstalling(worker) {
  worker.addEventListener('statechange', () => {
    log(`Service Worker 状態変化: ${worker.state}`);
    if (worker.state === 'installed') {
      showUpdateAvailable();
    }
  });
}

// アップデート利用可能の通知
function showUpdateAvailable() {
  log('Service Worker のアップデートが利用可能です');
  
  // 実際のアプリケーションでは、ここでユーザーに更新の通知を表示
  // 例: トーストメッセージやバナーなど
  if (confirm('アプリケーションの新しいバージョンが利用可能です。更新しますか？')) {
    // 待機中の Service Worker をアクティブ化
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  // オンライン/オフライン状態の変化を監視
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  // キャッシュ更新ボタン
  if (elements.cacheBtn) {
    elements.cacheBtn.addEventListener('click', updateCache);
  }
  
  // バックグラウンド同期ボタン
  if (elements.syncBtn) {
    elements.syncBtn.addEventListener('click', requestBackgroundSync);
  }
  
  // ページの可視性変化を監視
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  log('イベントリスナー設定完了');
}

// オンライン状態の変化を処理
function handleOnlineStatusChange() {
  AppState.isOnline = navigator.onLine;
  log(`オンライン状態変化: ${AppState.isOnline ? 'オンライン' : 'オフライン'}`);
  updateUI();
  
  if (AppState.isOnline) {
    // オンライン復帰時にキャッシュを更新
    updateCache();
  }
}

// ページの可視性変化を処理
function handleVisibilityChange() {
  if (document.hidden) {
    log('ページが非表示になりました');
  } else {
    log('ページが表示されました');
    // ページが再表示された時に状態を更新
    updateUI();
  }
}

// UIの状態更新
function updateUI() {
  // Service Worker の状態表示
  if (elements.swStatus) {
    elements.swStatus.textContent = AppState.serviceWorkerReady ? '登録済み' : '未登録';
    elements.swStatus.style.color = AppState.serviceWorkerReady ? 'green' : 'red';
  }
  
  // オンライン状態表示
  if (elements.onlineStatus) {
    elements.onlineStatus.textContent = AppState.isOnline ? 'オンライン' : 'オフライン';
    elements.onlineStatus.style.color = AppState.isOnline ? 'green' : 'red';
  }
  
  // インストール状態の確認と表示
  checkInstallStatus();
  
  log('UI状態を更新しました');
}

// インストール状態の確認
async function checkInstallStatus() {
  if (!elements.installCheckStatus) return;
  
  try {
    // PWA がインストールされているかチェック
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebApk = window.navigator.standalone === true;
    const isInPWA = isStandalone || isInWebApk;
    
    elements.installCheckStatus.textContent = isInPWA ? 'インストール済み' : '未インストール';
    elements.installCheckStatus.style.color = isInPWA ? 'green' : 'orange';
    
    log(`PWA インストール状態: ${isInPWA ? 'インストール済み' : '未インストール'}`);
  } catch (error) {
    log(`インストール状態チェックエラー: ${error}`);
    elements.installCheckStatus.textContent = '確認エラー';
    elements.installCheckStatus.style.color = 'red';
  }
}

// キャッシュ更新機能
async function updateCache() {
  if (!AppState.serviceWorkerReady) {
    log('Service Worker が利用できないためキャッシュを更新できません');
    if (elements.cacheStatus) {
      elements.cacheStatus.textContent = 'ステータス: Service Worker未対応';
    }
    return;
  }
  
  try {
    log('キャッシュ更新を開始');
    if (elements.cacheStatus) {
      elements.cacheStatus.textContent = 'ステータス: 更新中...';
    }
    
    // Service Worker にキャッシュ更新を要求
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      log('Service Worker 更新チェック完了');
    }
    
    // キャッシュを手動で更新
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          try {
            const response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response);
            }
          } catch (error) {
            log(`キャッシュ更新エラー (${request.url}): ${error}`);
          }
        }
      }
    }
    
    if (elements.cacheStatus) {
      elements.cacheStatus.textContent = 'ステータス: 更新完了';
    }
    log('キャッシュ更新完了');
    
  } catch (error) {
    log(`キャッシュ更新エラー: ${error}`);
    if (elements.cacheStatus) {
      elements.cacheStatus.textContent = 'ステータス: 更新エラー';
    }
  }
}

// バックグラウンド同期の要求
async function requestBackgroundSync() {
  if (!AppState.serviceWorkerReady) {
    log('Service Worker が利用できないため同期できません');
    if (elements.syncStatus) {
      elements.syncStatus.textContent = 'ステータス: Service Worker未対応';
    }
    return;
  }
  
  try {
    log('バックグラウンド同期を要求');
    if (elements.syncStatus) {
      elements.syncStatus.textContent = 'ステータス: 同期要求中...';
    }
    
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      await registration.sync.register('test-sync');
      log('バックグラウンド同期を登録');
      
      if (elements.syncStatus) {
        elements.syncStatus.textContent = 'ステータス: 同期登録完了';
      }
    } else {
      log('バックグラウンド同期はサポートされていません');
      if (elements.syncStatus) {
        elements.syncStatus.textContent = 'ステータス: 同期未対応';
      }
    }
    
  } catch (error) {
    log(`バックグラウンド同期エラー: ${error}`);
    if (elements.syncStatus) {
      elements.syncStatus.textContent = 'ステータス: 同期エラー';
    }
  }
}

// アプリケーション情報の取得
function getAppInfo() {
  return {
    serviceWorkerReady: AppState.serviceWorkerReady,
    isOnline: AppState.isOnline,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    url: window.location.href
  };
}

// エラーハンドリング
window.addEventListener('error', (event) => {
  log(`JavaScript エラー: ${event.error}`);
  console.error('詳細:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  log(`未処理の Promise エラー: ${event.reason}`);
  console.error('詳細:', event.reason);
});

// グローバル関数としてエクスポート（デバッグ用）
window.PWATest = {
  getAppInfo,
  updateCache,
  requestBackgroundSync,
  log
};

log('app.js ファイル読み込み完了');