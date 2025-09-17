// PWAインストール機能の実装
// このファイルは beforeinstallprompt イベントを使用してカスタムインストールUIを提供します

// デバッグ用のログ関数
function logInstall(message) {
  console.log(`[Install] ${message}`);
}

// インストール関連の状態管理
const InstallState = {
  promptEvent: null,
  canInstall: false,
  isInstalled: false,
  installSupported: false
};

// DOM要素の参照
let installBtn = null;
let installStatus = null;

// インストール機能の初期化
document.addEventListener('DOMContentLoaded', function() {
  logInstall('インストール機能初期化開始');
  
  // DOM要素を取得
  installBtn = document.getElementById('installBtn');
  installStatus = document.getElementById('installStatus');
  
  // イベントリスナーを設定
  setupInstallEventListeners();
  
  // 初期状態をチェック
  checkInstallStatus();
  
  logInstall('インストール機能初期化完了');
});

// インストール関連のイベントリスナー設定
function setupInstallEventListeners() {
  // beforeinstallprompt イベント - PWAインストール可能時に発火
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  
  // appinstalled イベント - PWAインストール完了時に発火
  window.addEventListener('appinstalled', handleAppInstalled);
  
  // インストールボタンのクリックイベント
  if (installBtn) {
    installBtn.addEventListener('click', handleInstallClick);
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