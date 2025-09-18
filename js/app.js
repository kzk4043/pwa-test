// PWAテストアプリケーションのメインファイル
// このファイルはアプリケーションの初期化と全体的な状態管理を行います
// 主な機能：Service Worker管理、オンライン状態監視、キャッシュ制御、バックグラウンド同期

/**
 * デバッグ用のログ関数
 * 全てのログメッセージに[App]プレフィックスを付けて出力
 * 開発時やトラブルシューティング時に重要な情報を提供
 * @param {string} message - ログに出力するメッセージ
 */
function log(message) {
  console.log(`[App] ${message}`);
}

/**
 * アプリケーションの状態管理オブジェクト
 * PWAの主要な状態を一箇所で管理し、他のモジュールからも参照可能
 */
const AppState = {
  // Service Workerが正常に登録され、使用可能かどうか
  serviceWorkerReady: false,
  
  // ネットワーク接続状態（navigator.onLineの値をキャッシュ）
  // オンライン：true、オフライン：false
  isOnline: navigator.onLine,
  
  // PWAインストールプロンプトイベント（beforeinstallprompt）を保持
  // 他のファイル（install.js）で使用される可能性があるため、ここで定義
  installPromptEvent: null
};

/**
 * DOM要素の参照を保持するオブジェクト
 * getElementById()を何度も呼び出すのを避けるため、初期化時に取得して保持
 * パフォーマンス向上とコードの可読性向上を目的とする
 */
const elements = {};

/**
 * アプリケーションの初期化処理
 * DOMが完全に読み込まれた後に実行される
 * PWAの全ての主要機能を順序立てて初期化
 */
document.addEventListener('DOMContentLoaded', function() {
  log('アプリケーション初期化開始');
  
  // STEP1: DOM要素を取得して elements オブジェクトに格納
  // 後続の処理で頻繁に使用するDOM要素への参照を事前に取得
  initializeElements();
  
  // STEP2: Service Workerを登録
  // PWAの核となる機能（オフライン対応、プッシュ通知等）を有効化
  registerServiceWorker();
  
  // STEP3: 各種イベントリスナーを設定
  // オンライン/オフライン状態、ボタンクリック等のイベントハンドリング
  setupEventListeners();
  
  // STEP4: UIの初期状態を更新
  // Service Worker状態、オンライン状態、インストール状態を表示
  updateUI();
  
  log('アプリケーション初期化完了');
});

/**
 * DOM要素の参照を初期化する関数
 * index.htmlに定義されたDOM要素をJavaScriptから操作するために参照を取得
 * この関数で取得したDOM要素は elements オブジェクトに格納され、
 * アプリ全体で再利用される。これによりgetElementById()の呼び出し回数を減らしている。
 */
function initializeElements() {
  // デバッグ情報表示用の要素群
  // これらの要素はindex.htmlのデバッグ情報セクションに定義されている
  elements.swStatus = document.getElementById('swStatus');                     // Service Workerの状態表示用スパン
  elements.onlineStatus = document.getElementById('onlineStatus');             // オンライン/オフライン状態表示用スパン
  elements.installCheckStatus = document.getElementById('installCheckStatus'); // インストール状態表示用スパン
  
  // キャッシュ機能関連の要素群
  // ユーザーが手動でキャッシュを更新したり、状態を確認したりするための要素
  elements.cacheBtn = document.getElementById('cacheBtn');       // キャッシュ更新ボタン
  elements.cacheStatus = document.getElementById('cacheStatus'); // キャッシュ状態表示用パラグラフ
  
  // バックグラウンド同期機能関連の要素群
  // Service Workerのバックグラウンド同期機能をテストするための要素
  elements.syncBtn = document.getElementById('syncBtn');       // バックグラウンド同期テストボタン
  elements.syncStatus = document.getElementById('syncStatus'); // 同期状態表示用パラグラフ
  
  log('DOM要素の取得完了 - 合計' + Object.keys(elements).length + '個の要素を管理下に置きました');
}

/**
 * Service Workerの登録と初期設定を行う関数
 * PWAの核となる機能であるService Workerをブラウザに登録し、
 * オフライン機能、プッシュ通知、バックグラウンド同期などを有効化する
 * 
 * Service Workerの状態遷移:
 * 1. installing - インストール中
 * 2. installed/waiting - インストール完了、アクティベート待ち
 * 3. activating - アクティベート中
 * 4. activated - アクティブ、使用可能
 * 
 * @returns {Promise<ServiceWorkerRegistration|null>} 登録成功時はServiceWorkerRegistrationオブジェクト、失敗時はnull
 */
async function registerServiceWorker() {
  // ブラウザがService Workerに対応しているかチェック
  // 古いブラウザや一部のブラウザではサポートされていない
  if ('serviceWorker' in navigator) {
    try {
      log('Service Worker 登録中... (ファイル: /sw.js)');
      
      // Service Workerスクリプトを登録
      // scope: '/pwa-test/' はサブディレクトリ以下の全てのリクエストを制御することを意味
      const registration = await navigator.serviceWorker.register('/pwa-test/sw.js', {
        scope: '/pwa-test/' // GitHub Pagesのサブディレクトリを制御範囲とする
      });
      
      log(`Service Worker 登録成功 - スコープ: ${registration.scope}`);
      
      // アプリケーション状態を更新（他の機能でService Workerを使用可能になる）
      AppState.serviceWorkerReady = true;
      
      // Service Workerの状態変化を監視するリスナーを設定
      // アップデートやエラーなどをユーザーに通知するため
      setupServiceWorkerListeners(registration);
      
      // 既にアクティブなService Workerが存在する場合の処理
      // 初回訪問時やリロード時にこの状態になる
      if (registration.active) {
        log('アクティブなService Workerを検出 - 既に動作中');
      }
      
      // アップデートのために待機中のService Workerがある場合
      // 新しいバージョンが利用可能だが、既存のタブが開いているため待機中
      if (registration.waiting) {
        log('待機中のService Workerを検出 - アップデートが利用可能');
        showUpdateAvailable(); // ユーザーにアップデートを通知
      }
      
      // 新しいService Workerがインストール中の場合
      // 初回訪問時やService Workerスクリプトが更新された時に発生
      if (registration.installing) {
        log('インストール中のService Workerを検出 - 進行状況を追跡開始');
        trackInstalling(registration.installing); // インストール状態を追跡
      }
      
      return registration; // 成功時はServiceWorkerRegistrationオブジェクトを返す
      
    } catch (error) {
      // Service Workerの登録に失敗した場合のエラーハンドリング
      // ネットワークエラー、スクリプトエラー、HTTPS要件不備等が原因
      log(`Service Worker 登録エラー: ${error.message}`);
      log('エラー詳細:', error);
      
      AppState.serviceWorkerReady = false; // 状態を更新し、他の機能に影響させる
      return null; // 失敗時はnullを返す
    }
  } else {
    // ブラウザがService Workerに対応していない場合
    // Internet Explorer、古いバージョンのSafari等で発生
    log('Service Worker はこのブラウザでサポートされていません');
    log('ブラウザ情報: ' + navigator.userAgent);
    
    AppState.serviceWorkerReady = false;
    return null;
  }
}

/**
 * Service Workerのイベントリスナー設定関数
 * Service Workerのライフサイクルイベント（アップデート、状態変化等）を監視し、
 * ユーザーに適切な通知やアクションを提供する
 * @param {ServiceWorkerRegistration} registration - Service Workerの登録オブジェクト
 */
function setupServiceWorkerListeners(registration) {
  // 'updatefound'イベント: 新しいService Workerが見つかった時に発火
  // サーバー上のsw.jsが更新されたときや、初回訪問時に発生
  registration.addEventListener('updatefound', () => {
    log('Service Worker のアップデートを検出 - 新しいバージョンが利用可能');
    const newWorker = registration.installing; // インストール中のService Workerを取得
    trackInstalling(newWorker); // インストール進行状況を追跡
  });
  
  // 'controllerchange'イベント: アクティブなService Workerが変わった時に発火
  // 新しいService Workerがアクティブになった時に、ページをリロードして新機能を適用
  let refreshing = false; // 重複リロード防止フラグ
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return; // 既にリロード中の場合は処理をスキップ
    log('Service Worker が更新されました - ページをリロードして新機能を適用');
    refreshing = true;
    window.location.reload(); // ページ全体をリロードして新しいService Workerを使用
  });
}

/**
 * インストール中のService Workerの状態を追跡する関数
 * Service Workerのインストール進行状況を監視し、完了時に適切な処理を実行
 * @param {ServiceWorker} worker - 追跡対象のService Workerインスタンス
 */
function trackInstalling(worker) {
  // Service Workerの状態変化を監視
  // 状態: installing → installed → activating → activated
  worker.addEventListener('statechange', () => {
    log(`Service Worker 状態変化: ${worker.state}`);
    
    // 'installed'状態: インストール完了、アクティベート待ち
    // この時点でユーザーにアップデートを通知する
    if (worker.state === 'installed') {
      showUpdateAvailable(); // アップデート利用可能の通知を表示
    }
  });
}

/**
 * Service Workerアップデート利用可能の通知関数
 * 新しいService Workerが利用可能になった時にユーザーに通知し、
 * ユーザーの同意を得てアップデートを適用する
 * 
 * 実際のプロダクションでは、confirm()の代わりに、
 * トースト通知やバナーなどのより優雅なUIを使用することを推奨
 */
function showUpdateAvailable() {
  log('Service Worker のアップデートが利用可能です');
  
  // ユーザーにアップデートの確認を求める
  // 実際のアプリケーションでは、より上品なUI（スナックバー、モーダル等）を使用すべき
  const shouldUpdate = confirm(
    'アプリケーションの新しいバージョンが利用可能です。\n' +
    '新機能やバグ修正が含まれている可能性があります。\n' +
    '今すぐ更新しますか？'
  );
  
  if (shouldUpdate) {
    log('ユーザーがアップデートを承認 - Service Workerをアクティベート中');
    
    // 待機中のService Workerを取得してアクティブ化を指示
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration && registration.waiting) {
        // 'SKIP_WAITING'メッセージをService Workerに送信
        // これにより、Service Workerがself.skipWaiting()を実行し、即座にアクティブになる
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        log('SKIP_WAITINGメッセージをService Workerに送信しました');
      } else {
        log('待機中のService Workerが見つかりません');
      }
    });
  } else {
    log('ユーザーがアップデートを拒否 - 次回訪問時に再度通知');
  }
}

/**
 * アプリケーション全体のイベントリスナー設定関数
 * ユーザーインタラクション、ブラウザイベント、システムイベントを監視し、
 * PWAの動作を適切に制御するためのリスナーを設定
 */
function setupEventListeners() {
  // ネットワーク状態の監視を設定
  // 'online'イベント: ネットワーク接続が復旧した時に発火
  window.addEventListener('online', handleOnlineStatusChange);
  // 'offline'イベント: ネットワーク接続が切断された時に発火
  window.addEventListener('offline', handleOnlineStatusChange);
  
  // キャッシュ更新ボタンのイベントリスナー設定
  // ユーザーが手動でキャッシュを更新したい場合に使用
  if (elements.cacheBtn) {
    elements.cacheBtn.addEventListener('click', updateCache);
    log('キャッシュ更新ボタンのリスナーを設定');
  }
  
  // バックグラウンド同期ボタンのイベントリスナー設定
  // Service Workerのバックグラウンド同期機能をテストするため
  if (elements.syncBtn) {
    elements.syncBtn.addEventListener('click', requestBackgroundSync);
    log('バックグラウンド同期ボタンのリスナーを設定');
  }
  
  // Page Visibility APIを使用したページ可視性の監視
  // ユーザーがページを離れたり戻ってきたりした時の処理に使用
  // パフォーマンス最適化やリアルタイムデータ更新に有効
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  log('イベントリスナー設定完了 - 合計3種類のイベントを監視中');
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