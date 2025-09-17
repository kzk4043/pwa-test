/**
 * プッシュ通知機能の実装
 * このファイルは Web Push API と Notification API を使用し、
 * PWAアプリケーションにプッシュ通知機能を提供します。
 * 
 * 主な機能:
 * - 通知許可の取得と管理
 * - Push Manager サブスクリプションの作成と管理
 * - VAPID キーを使用したサーバー認証
 * - ローカル通知のテスト機能
 * - iOS 16.4+ と Android のクロスプラットフォーム対応
 * 
 * 重要な注意事項:
 * - 実際のプッシュ通知を送信するには別途サーバーサイドの実装が必要
 * - VAPID キーペアの生成と管理が必要
 * - iOS では PWA としてインストールされた場合のみ動作（iOS 16.4+）
 */

/**
 * プッシュ通知機能専用のデバッグログ関数
 * [Push]プレフィックスでプッシュ通知関連のログを区別
 * @param {string} message - ログに出力するメッセージ
 */
function logPush(message) {
  console.log(`[Push] ${message}`);
}

/**
 * プッシュ通知の状態管理オブジェクト
 * プッシュ通知のサポート状況、許可状態、サブスクリプション情報を管理
 */
const PushState = {
  // ブラウザがプッシュ通知をサポートしているかどうか
  // Service Worker、Push Manager、Notification API の全てが必要
  isSupported: false,
  
  // 現在の通知許可状態
  // 'default'（未設定）、'granted'（許可）、'denied'（拒否）のいずれか
  permission: 'default',
  
  // 現在のプッシュサブスクリプションオブジェクト
  // これにはendpoint、keysなどの情報が含まれ、サーバーに送信される
  subscription: null,
  
  // VAPID（Voluntary Application Server Identification）公開キー
  // プッシュサーバーの認証に使用。実際の実装では必須
  // 本テストでは null でも動作するが、本番環境では要設定
  vapidPublicKey: null
};

/**
 * プッシュ通知関連のDOM要素への参照
 * グローバル変数として定義し、このモジュール内の各関数からアクセス可能
 */
let notifyBtn = null;     // 「通知を有効化」ボタンの参照
let testNotifyBtn = null; // 「テスト通知」ボタンの参照
let notifyStatus = null;  // 通知状態表示用パラグラフの参照

/**
 * プッシュ通知機能の初期化処理
 * DOM読み込み後に実行され、プッシュ通知機能に必要な
 * 全ての設定と初期状態チェックを実行
 */
document.addEventListener('DOMContentLoaded', function() {
  logPush('プッシュ通知機能初期化開始');
  
  // STEP1: プッシュ通知関連のDOM要素を取得
  // これらの要素はindex.htmlのプッシュ通知セクションに定義されている
  notifyBtn = document.getElementById('notifyBtn');         // 通知許可を求めるボタン
  testNotifyBtn = document.getElementById('testNotifyBtn'); // ローカルテスト通知を送信するボタン
  notifyStatus = document.getElementById('notifyStatus');   // 通知状態を表示するテキスト要素
  
  // STEP2: ブラウザのプッシュ通知サポート状況をチェック
  // Service Worker、Push Manager、Notification APIの全てが必要
  checkPushSupport();
  
  // STEP3: ボタンクリックなどのイベントリスナーを設定
  setupPushEventListeners();
  
  // STEP4: 既に作成済みのサブスクリプションがあるかチェック
  // ページリロード時に既存の設定を復元するため
  checkExistingSubscription();
  
  logPush('プッシュ通知機能初期化完了');
});

/**
 * プッシュ通知サポート状況のチェック関数
 * ブラウザがプッシュ通知機能をサポートしているかを確認
 * 必要なAPI（Service Worker、Push Manager、Notification API）の存在をチェック
 * 
 * チェック項目:
 * 1. Service Worker API - PWAのバックグラウンド処理に必要
 * 2. Push Manager API - プッシュサブスクリプション管理に必要
 * 3. Notification API - 通知の表示に必要
 */
function checkPushSupport() {
  logPush('プッシュ通知サポート状況をチェック中...');
  
  // Service Worker API のサポートチェック
  // PWAの核となる機能で、プッシュ通知の受信処理に必須
  if (!('serviceWorker' in navigator)) {
    logPush('⚠️ Service Worker がサポートされていません');
    logPush('ブラウザ: ' + navigator.userAgent);
    PushState.isSupported = false;
    return;
  }
  
  // Push Manager API のサポートチェック
  // プッシュサブスクリプションの作成・管理に必要
  if (!('PushManager' in window)) {
    logPush('⚠️ Push Manager がサポートされていません');
    logPush('このブラウザではプッシュ通知を受信できません');
    PushState.isSupported = false;
    return;
  }
  
  // Notification API のサポートチェック
  // ユーザーに対する通知表示に必要
  if (!('Notification' in window)) {
    logPush('⚠️ Notification API がサポートされていません');
    logPush('このブラウザでは通知を表示できません');
    PushState.isSupported = false;
    return;
  }
  
  // 全てのAPIがサポートされている場合
  PushState.isSupported = true;
  PushState.permission = Notification.permission; // 現在の通知許可状態を取得
  
  logPush('✅ プッシュ通知サポート確認完了');
  logPush(`サポート状況: ${PushState.isSupported}`);
  logPush(`現在の通知許可状態: ${PushState.permission}`);
  
  // iOS 特有の制限をチェック
  checkiOSLimitations();
  
  // UIを更新してサポート状況を反映
  updatePushUI();
}

/**
 * iOS特有のプッシュ通知制限をチェックする関数
 * iOS 16.4以降でサポートされたが、PWAとしてインストール済みの場合のみ動作
 */
function checkiOSLimitations() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  if (isIOS) {
    logPush('iOSデバイスを検出');
    
    if (!isStandalone) {
      logPush('⚠️ iOSではプッシュ通知はPWAとしてインストールされた場合のみ動作します');
      logPush('現在はSafariブラウザで実行中のため、プッシュ通知は利用できません');
    } else {
      logPush('✅ PWAモードで実行中 - iOSでもプッシュ通知が利用可能です');
    }
  }
}

// プッシュ通知関連のイベントリスナー設定
function setupPushEventListeners() {
  // 通知有効化ボタン
  if (notifyBtn) {
    notifyBtn.addEventListener('click', handleNotificationRequest);
  }
  
  // テスト通知ボタン
  if (testNotifyBtn) {
    testNotifyBtn.addEventListener('click', handleTestNotification);
  }
  
  logPush('プッシュ通知イベントリスナー設定完了');
}

// 既存のプッシュサブスクリプションをチェック
async function checkExistingSubscription() {
  if (!PushState.isSupported) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      logPush('既存のプッシュサブスクリプションを発見');
      PushState.subscription = subscription;
      logPush(`サブスクリプション詳細: ${JSON.stringify(subscription.toJSON(), null, 2)}`);
    } else {
      logPush('既存のプッシュサブスクリプションなし');
    }
    
    updatePushUI();
    
  } catch (error) {
    logPush(`サブスクリプションチェックエラー: ${error}`);
  }
}

// 通知許可リクエストの処理
async function handleNotificationRequest() {
  logPush('通知許可リクエスト開始');
  
  if (!PushState.isSupported) {
    logPush('プッシュ通知がサポートされていません');
    updateNotifyStatus('エラー: プッシュ通知未対応');
    return;
  }
  
  try {
    updateNotifyStatus('通知許可を要求中...');
    
    // 通知許可を要求
    const permission = await Notification.requestPermission();
    PushState.permission = permission;
    
    logPush(`通知許可結果: ${permission}`);
    
    if (permission === 'granted') {
      logPush('通知許可が付与されました');
      await subscribeToPush();
    } else if (permission === 'denied') {
      logPush('通知許可が拒否されました');
      updateNotifyStatus('通知許可が拒否されました');
    } else {
      logPush('通知許可が保留されました');
      updateNotifyStatus('通知許可が保留されました');
    }
    
    updatePushUI();
    
  } catch (error) {
    logPush(`通知許可リクエストエラー: ${error}`);
    updateNotifyStatus('エラー: 通知許可取得失敗');
  }
}

// プッシュサブスクリプションの作成
async function subscribeToPush() {
  try {
    logPush('プッシュサブスクリプション作成開始');
    updateNotifyStatus('プッシュサブスクリプション作成中...');
    
    const registration = await navigator.serviceWorker.ready;
    
    // VAPID キー設定（実際の実装では環境変数から取得）
    // これは公開鍵で、実際のプッシュサーバーとペアになる秘密鍵が必要
    const applicationServerKey = PushState.vapidPublicKey;
    
    const subscribeOptions = {
      userVisibleOnly: true, // ユーザーに見える通知のみ許可
      applicationServerKey: applicationServerKey // 実際の VAPID 公開鍵が必要
    };
    
    // VAPID キーがない場合は簡易版で作成
    if (!applicationServerKey) {
      logPush('VAPID キーが設定されていません - 簡易サブスクリプションを作成');
      delete subscribeOptions.applicationServerKey;
    }
    
    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    
    PushState.subscription = subscription;
    logPush('プッシュサブスクリプション作成完了');
    logPush(`サブスクリプション詳細: ${JSON.stringify(subscription.toJSON(), null, 2)}`);
    
    // 実際のアプリケーションでは、ここでサブスクリプション情報をサーバーに送信
    await sendSubscriptionToServer(subscription);
    
    updateNotifyStatus('プッシュ通知有効化完了');
    
  } catch (error) {
    logPush(`プッシュサブスクリプション作成エラー: ${error}`);
    updateNotifyStatus('エラー: サブスクリプション作成失敗');
    
    // 詳細なエラー情報をログ出力
    if (error.name === 'NotSupportedError') {
      logPush('プッシュ通知がこの環境でサポートされていません');
    } else if (error.name === 'NotAllowedError') {
      logPush('プッシュ通知の許可が拒否されています');
    } else if (error.name === 'AbortError') {
      logPush('サブスクリプション作成が中断されました');
    }
  }
}

// サブスクリプション情報をサーバーに送信（模擬実装）
async function sendSubscriptionToServer(subscription) {
  logPush('サブスクリプション情報をサーバーに送信中...');
  
  // 実際の実装では、ここで自分のプッシュサーバーに POST リクエストを送信
  // const response = await fetch('/api/push/subscribe', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(subscription.toJSON())
  // });
  
  // 模擬的にローカルストレージに保存
  try {
    localStorage.setItem('push-subscription', JSON.stringify(subscription.toJSON()));
    logPush('サブスクリプション情報をローカルストレージに保存しました');
  } catch (error) {
    logPush(`ローカルストレージ保存エラー: ${error}`);
  }
  
  logPush('サーバー送信完了（模擬）');
}

// テスト通知の送信
async function handleTestNotification() {
  logPush('テスト通知送信開始');
  
  if (PushState.permission !== 'granted') {
    logPush('通知許可がありません');
    updateNotifyStatus('エラー: 通知許可が必要です');
    return;
  }
  
  try {
    updateNotifyStatus('テスト通知送信中...');
    
    // Service Worker 経由でローカル通知を表示
    const registration = await navigator.serviceWorker.ready;
    
    const notificationTitle = 'PWAテスト通知';
    const notificationOptions = {
      body: 'これはテスト通知です。PWAが正常に動作しています。',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        type: 'test',
        timestamp: Date.now()
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
      ],
      requireInteraction: false, // 自動的に消える
      silent: false // 音とバイブレーションを有効
    };
    
    await registration.showNotification(notificationTitle, notificationOptions);
    
    logPush('テスト通知送信完了');
    updateNotifyStatus('テスト通知送信完了');
    
    // 少し時間を置いてステータスをリセット
    setTimeout(() => {
      updatePushUI();
    }, 3000);
    
  } catch (error) {
    logPush(`テスト通知送信エラー: ${error}`);
    updateNotifyStatus('エラー: テスト通知送信失敗');
  }
}

// プッシュ通知UIの更新
function updatePushUI() {
  if (!notifyBtn || !notifyStatus || !testNotifyBtn) {
    logPush('UIエレメントが見つかりません');
    return;
  }
  
  if (!PushState.isSupported) {
    // プッシュ通知未対応
    notifyBtn.disabled = true;
    testNotifyBtn.disabled = true;
    notifyBtn.textContent = 'プッシュ未対応';
    updateNotifyStatus('ブラウザ未対応');
    
  } else if (PushState.permission === 'granted' && PushState.subscription) {
    // 通知許可済み & サブスクリプション有り
    notifyBtn.disabled = true;
    testNotifyBtn.disabled = false;
    notifyBtn.textContent = '通知有効化済み';
    testNotifyBtn.textContent = 'テスト通知';
    updateNotifyStatus('プッシュ通知有効');
    
  } else if (PushState.permission === 'granted') {
    // 通知許可済み & サブスクリプション無し
    notifyBtn.disabled = false;
    testNotifyBtn.disabled = true;
    notifyBtn.textContent = 'サブスクリプション作成';
    updateNotifyStatus('サブスクリプション未作成');
    
  } else if (PushState.permission === 'denied') {
    // 通知許可拒否
    notifyBtn.disabled = true;
    testNotifyBtn.disabled = true;
    notifyBtn.textContent = '通知許可拒否';
    updateNotifyStatus('通知許可が拒否されています');
    
  } else {
    // 通知許可未取得
    notifyBtn.disabled = false;
    testNotifyBtn.disabled = true;
    notifyBtn.textContent = '通知を有効化';
    testNotifyBtn.textContent = 'テスト通知';
    updateNotifyStatus('通知許可未取得');
  }
  
  logPush(`UI更新完了: ${notifyStatus.textContent}`);
}

// プッシュ通知ステータスの更新
function updateNotifyStatus(message) {
  if (notifyStatus) {
    notifyStatus.textContent = `ステータス: ${message}`;
    logPush(`ステータス更新: ${message}`);
  }
}

// サブスクリプションの解除
async function unsubscribeFromPush() {
  if (!PushState.subscription) {
    logPush('アクティブなサブスクリプションがありません');
    return false;
  }
  
  try {
    logPush('プッシュサブスクリプション解除開始');
    
    const successful = await PushState.subscription.unsubscribe();
    
    if (successful) {
      logPush('プッシュサブスクリプション解除完了');
      PushState.subscription = null;
      
      // ローカルストレージからも削除
      localStorage.removeItem('push-subscription');
      
      // 実際の実装では、サーバーからもサブスクリプションを削除
      // await removeSubscriptionFromServer();
      
      updatePushUI();
      return true;
    } else {
      logPush('プッシュサブスクリプション解除失敗');
      return false;
    }
    
  } catch (error) {
    logPush(`サブスクリプション解除エラー: ${error}`);
    return false;
  }
}

// プッシュ通知の詳細情報を取得（デバッグ用）
function getPushInfo() {
  const info = {
    isSupported: PushState.isSupported,
    permission: PushState.permission,
    hasSubscription: PushState.subscription !== null,
    subscriptionDetails: PushState.subscription?.toJSON(),
    browserSupport: {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window
    },
    vapidKey: PushState.vapidPublicKey ? '設定済み' : '未設定'
  };
  
  logPush('プッシュ通知詳細情報:');
  console.table(info);
  return info;
}

// VAPID キーの設定（実際のアプリケーションで使用）
function setVapidPublicKey(key) {
  PushState.vapidPublicKey = key;
  logPush(`VAPID 公開鍵を設定: ${key.substring(0, 20)}...`);
}

// エクスポート（デバッグ用）
window.PWAPush = {
  getState: () => PushState,
  getPushInfo,
  unsubscribeFromPush,
  setVapidPublicKey,
  handleTestNotification
};

logPush('push.js ファイル読み込み完了');