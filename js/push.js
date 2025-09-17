// プッシュ通知機能の実装
// このファイルは Web Push API を使用してプッシュ通知機能を提供します
// 注意: 実際のプッシュ通知を送信するには別途サーバーサイドの実装が必要です

// デバッグ用のログ関数
function logPush(message) {
  console.log(`[Push] ${message}`);
}

// プッシュ通知の状態管理
const PushState = {
  isSupported: false,
  permission: 'default',
  subscription: null,
  vapidPublicKey: null // 実際の実装では VAPID キーを設定
};

// DOM要素の参照
let notifyBtn = null;
let testNotifyBtn = null;
let notifyStatus = null;

// プッシュ通知機能の初期化
document.addEventListener('DOMContentLoaded', function() {
  logPush('プッシュ通知機能初期化開始');
  
  // DOM要素を取得
  notifyBtn = document.getElementById('notifyBtn');
  testNotifyBtn = document.getElementById('testNotifyBtn');
  notifyStatus = document.getElementById('notifyStatus');
  
  // プッシュ通知のサポート状況をチェック
  checkPushSupport();
  
  // イベントリスナーを設定
  setupPushEventListeners();
  
  // 既存のサブスクリプションをチェック
  checkExistingSubscription();
  
  logPush('プッシュ通知機能初期化完了');
});

// プッシュ通知サポート状況のチェック
function checkPushSupport() {
  // Service Worker サポートをチェック
  if (!('serviceWorker' in navigator)) {
    logPush('Service Worker がサポートされていません');
    PushState.isSupported = false;
    return;
  }
  
  // Push Manager サポートをチェック
  if (!('PushManager' in window)) {
    logPush('Push Manager がサポートされていません');
    PushState.isSupported = false;
    return;
  }
  
  // Notification API サポートをチェック
  if (!('Notification' in window)) {
    logPush('Notification API がサポートされていません');
    PushState.isSupported = false;
    return;
  }
  
  PushState.isSupported = true;
  PushState.permission = Notification.permission;
  logPush(`プッシュ通知サポート状況: ${PushState.isSupported}`);
  logPush(`現在の通知許可状態: ${PushState.permission}`);
  
  updatePushUI();
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