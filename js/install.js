/**
 * PWAインストール機能の実装
 * このファイルは Web App Install API と beforeinstallprompt イベントを使用し、
 * ユーザーにカスタムのUIでPWAインストール体験を提供します。
 * 
 * 主な機能:
 * - beforeinstallpromptイベントのキャッチと制御
 * - カスタムインストールボタンの提供
 * - インストール状態の追跡と表示
 * - iOS Safariなどの対応していないブラウザへの対応
 */

/**
 * インストール機能専用のデバッグログ関数
 * [Install]プレフィックスでインストール関連のログを区別
 * @param {string} message - ログに出力するメッセージ
 */
function logInstall(message) {
  console.log(`[Install] ${message}`);
}

/**
 * インストール関連の状態管理オブジェクト
 * PWAのインストール可能性、インストール状態、ブラウザサポートを管理
 */
const InstallState = {
  // beforeinstallpromptイベントオブジェトを保持
  // このイベントは一度しか発火しないため、適切なタイミングで使用できるよう保持
  promptEvent: null,
  
  // 現在インストールが可能かどうかのフラグ
  // beforeinstallpromptイベントが発火しているtrueになる
  canInstall: false,
  
  // PWAが既にインストール済みかどうかのフラグ
  // display-mode: standalone などで判定
  isInstalled: false,
  
  // ブラウザがインストール機能をサポートしているかどうか
  // Service Worker、Notification API等のサポート状況で判定
  installSupported: false
};

/**
 * インストール関連のDOM要素への参照
 * グローバル変数として定義し、このモジュール内の各関数からアクセス可能
 */
let installBtn = null;    // 「PWAをインストール」ボタンの参照
let installStatus = null; // インストール状態表示用パラグラフの参照

/**
 * インストール機能の初期化処理
 * DOMが読み込まれた後に実行され、インストール機能に必要な
 * 全ての設定と初期状態チェックを実行
 */
document.addEventListener('DOMContentLoaded', function() {
  logInstall('インストール機能初期化開始');
  
  // STEP1: インストールボタンと状態表示用のDOM要素を取得
  // これらの要素はindex.htmlのインストールセクションに定義されている
  installBtn = document.getElementById('installBtn');       // ユーザーがクリックするインストールボタン
  installStatus = document.getElementById('installStatus'); // インストール状態を表示するテキスト要素
  
  // STEP2: 各種イベントリスナーを設定
  // beforeinstallprompt、appinstalled、クリックイベントなど
  setupInstallEventListeners();
  
  // STEP3: 現在のインストール状態をチェックしてUIを更新
  // PWAが既にインストールされているか、ブラウザがサポートしているか等を判定
  checkInstallStatus();
  
  logInstall('インストール機能初期化完了');
});

/**
 * インストール関連のイベントリスナー設定関数
 * PWAインストールのライフサイクルを監視し、適切なタイミングで
 * ユーザーにインストール体験を提供するためのリスナーを設定
 */
function setupInstallEventListeners() {
  // 'beforeinstallprompt'イベントリスナーの設定
  // このイベントはPWAのインストール条件が満たされた時にブラウザによって発火される
  // 条件: HTTPS、Service Worker登録、マニフェストファイル、適切なアイコンなど
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  
  // 'appinstalled'イベントリスナーの設定
  // このイベントはPWAが正常にインストールされた後に発火される
  // インストール完了の確認やアナリティクス送信に使用
  window.addEventListener('appinstalled', handleAppInstalled);
  
  // インストールボタンのクリックイベントリスナー
  // ユーザーがカスタムインストールボタンをクリックした時の処理
  if (installBtn) {
    installBtn.addEventListener('click', handleInstallClick);
    logInstall('インストールボタンのクリックリスナーを設定');
  } else {
    logInstall('警告: インストールボタンが見つかりません (ID: installBtn)');
  }
  
  // ディスプレイモードの変化を監視
  if (window.matchMedia) {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addListener(handleDisplayModeChange);
    
    // 初期状態をチェック
    handleDisplayModeChange(standaloneQuery);
  }
  
  logInstall('インストールイベントリスナー設定完了');
}

// beforeinstallprompt イベントの処理
function handleBeforeInstallPrompt(event) {
  logInstall('beforeinstallprompt イベントを受信');
  
  // ブラウザのデフォルトインストールプロンプトを無効化
  event.preventDefault();
  
  // イベントを保存してカスタムタイミングで使用
  InstallState.promptEvent = event;
  InstallState.canInstall = true;
  InstallState.installSupported = true;
  
  // UIを更新
  updateInstallUI();
  
  logInstall('インストール可能状態になりました');
  
  // インストール可能性を詳細ログ出力
  logInstallDetails();
}

// appinstalled イベントの処理
function handleAppInstalled(event) {
  logInstall('appinstalled イベントを受信 - PWAがインストールされました');
  
  // 状態を更新
  InstallState.isInstalled = true;
  InstallState.canInstall = false;
  InstallState.promptEvent = null;
  
  // UIを更新
  updateInstallUI();
  
  // インストール完了の通知（実際のアプリでは適切なフィードバックを提供）
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('PWAインストール完了', {
      body: 'アプリがホーム画面に追加されました',
      icon: '/icons/icon-192x192.png'
    });
  }
  
  // アナリティクス送信（実装時に追加）
  logInstall('PWAインストール完了イベントを記録');
}

// ディスプレイモードの変化処理
function handleDisplayModeChange(mediaQuery) {
  const isStandalone = mediaQuery.matches;
  const isInWebApk = window.navigator.standalone === true; // iOS Safari
  
  InstallState.isInstalled = isStandalone || isInWebApk;
  
  logInstall(`ディスプレイモード変化: standalone=${isStandalone}, webApk=${isInWebApk}`);
  updateInstallUI();
}

// インストールボタンのクリック処理
async function handleInstallClick() {
  logInstall('インストールボタンがクリックされました');
  
  if (!InstallState.promptEvent) {
    logInstall('インストールプロンプトが利用できません');
    updateInstallStatus('エラー: インストール不可能');
    return;
  }
  
  try {
    // インストールプロンプトを表示
    logInstall('インストールプロンプトを表示');
    updateInstallStatus('インストールプロンプト表示中...');
    
    const result = await InstallState.promptEvent.prompt();
    logInstall(`ユーザーの選択: ${result.outcome}`);
    
    if (result.outcome === 'accepted') {
      logInstall('ユーザーがインストールを許可');
      updateInstallStatus('インストール中...');
      
      // プロンプトイベントをクリア（一度しか使えない）
      InstallState.promptEvent = null;
      InstallState.canInstall = false;
      
    } else {
      logInstall('ユーザーがインストールを拒否');
      updateInstallStatus('インストールがキャンセルされました');
      
      // 少し時間を置いてステータスをリセット
      setTimeout(() => {
        updateInstallUI();
      }, 3000);
    }
    
  } catch (error) {
    logInstall(`インストールエラー: ${error}`);
    updateInstallStatus('エラー: インストール失敗');
    console.error('インストールエラー詳細:', error);
  }
}

// インストール状態のチェック
function checkInstallStatus() {
  logInstall('インストール状態をチェック中');
  
  // PWA対応ブラウザかチェック
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  InstallState.installSupported = isSupported;
  
  // 現在のディスプレイモードをチェック
  if (window.matchMedia) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebApk = window.navigator.standalone === true;
    InstallState.isInstalled = isStandalone || isInWebApk;
  }
  
  // ユーザーエージェントからインストール可能性を推測
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidChrome = userAgent.includes('android') && userAgent.includes('chrome');
  const isDesktopChrome = userAgent.includes('chrome') && !userAgent.includes('mobile');
  const canPotentiallyInstall = isAndroidChrome || isDesktopChrome;
  
  logInstall(`インストール状態チェック結果:`);
  logInstall(`- サポート対象ブラウザ: ${isSupported}`);
  logInstall(`- インストール済み: ${InstallState.isInstalled}`);
  logInstall(`- インストール可能(推測): ${canPotentiallyInstall}`);
  logInstall(`- beforeinstallprompt待機中: ${InstallState.promptEvent !== null}`);
  
  // UIを更新
  updateInstallUI();
}

// インストール詳細情報のログ出力
function logInstallDetails() {
  const details = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    standalone: window.navigator.standalone,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    hasPromptEvent: InstallState.promptEvent !== null,
    canInstall: InstallState.canInstall,
    isInstalled: InstallState.isInstalled
  };
  
  logInstall('インストール詳細情報:');
  console.table(details);
}

// インストールUIの更新
function updateInstallUI() {
  if (!installBtn || !installStatus) {
    logInstall('UIエレメントが見つかりません');
    return;
  }
  
  // インストール状態に応じてUIを更新
  if (InstallState.isInstalled) {
    // すでにインストール済み
    installBtn.disabled = true;
    installBtn.textContent = 'インストール済み';
    installStatus.textContent = 'ステータス: インストール済み';
    installStatus.style.color = 'green';
    
  } else if (InstallState.canInstall && InstallState.promptEvent) {
    // インストール可能
    installBtn.disabled = false;
    installBtn.textContent = 'PWAをインストール';
    installStatus.textContent = 'ステータス: インストール可能';
    installStatus.style.color = 'blue';
    
  } else if (!InstallState.installSupported) {
    // PWA未対応ブラウザ
    installBtn.disabled = true;
    installBtn.textContent = 'PWA未対応';
    installStatus.textContent = 'ステータス: ブラウザ未対応';
    installStatus.style.color = 'red';
    
  } else {
    // インストール条件を満たしていない
    installBtn.disabled = true;
    installBtn.textContent = 'インストール準備中';
    installStatus.textContent = 'ステータス: 条件未満たし';
    installStatus.style.color = 'orange';
  }
  
  logInstall(`UI更新完了: ${installStatus.textContent}`);
}

// インストール状態の手動更新
function updateInstallStatus(message) {
  if (installStatus) {
    installStatus.textContent = `ステータス: ${message}`;
    logInstall(`ステータス更新: ${message}`);
  }
}

// インストール可能性の手動チェック（デバッグ用）
function checkInstallCriteria() {
  const criteria = {
    isSecureContext: window.isSecureContext,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasManifest: document.querySelector('link[rel="manifest"]') !== null,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    hasValidManifest: true, // 実際の実装では manifest.json の内容をチェック
    meetsEngagementHeuristics: true // 実際の実装では訪問頻度などをチェック
  };
  
  logInstall('インストール条件チェック:');
  console.table(criteria);
  
  return criteria;
}

// ショートカット処理（manifest.json で定義されたショートカット用）
function handleShortcut() {
  const urlParams = new URLSearchParams(window.location.search);
  const shortcut = urlParams.get('shortcut');
  
  if (shortcut === 'install') {
    logInstall('ショートカットからインストールページに誘導');
    
    // インストールセクションにフォーカス
    const installSection = installBtn?.closest('section');
    if (installSection) {
      installSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// ページ読み込み時にショートカット処理を実行
document.addEventListener('DOMContentLoaded', handleShortcut);

// エクスポート（デバッグ用）
window.PWAInstall = {
  getState: () => InstallState,
  checkInstallCriteria,
  updateInstallUI,
  logInstallDetails
};

logInstall('install.js ファイル読み込み完了');