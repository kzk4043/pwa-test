# PWAテストプロジェクトの作成

## 目的
GitHub PagesにデプロイしてAndroid端末で動作確認できるPWAを作成し、主要機能をテストする。
**注意：PWAの機能テストが目的のため、サイト自体は極力シンプルに実装すること。**

## 要件

### 技術スタック
- Vanilla JavaScript（フレームワーク不使用）
- GitHub Pages（HTTPS環境）
- プッシュ通知API（別途構築予定）

### UIの方針
- 最小限のHTML（ボタンとステータス表示のみ）
- CSSは最低限の見やすさ確保のみ
- 各PWA機能をテストするボタンを配置

### 実装する機能
1. **PWAの基本機能**
   - マニフェストファイルの設定
   - Service Workerの実装（詳細なコメント付き）
   - ホーム画面へのインストール機能

2. **インストールプロンプト**
   - beforeinstallpromptイベントの実装
   - カスタムインストールUIの作成
   - インストール状態の管理

3. **プッシュ通知**
   - 通知許可の取得フロー
   - プッシュ通知の受信処理
   - 通知バッジの表示
   - 通知クリック時の動作

4. **オフライン機能**
   - 基本的なキャッシュ戦略の実装
   - オフライン時の代替ページ表示
   - キャッシュの更新戦略

5. **バックグラウンド同期（解説付き）**
   - バックグラウンド同期の基本実装
   - 実用例の提示

### プロジェクト構造
```
pwa-test/
├── index.html          # シンプルなテスト用UI
├── manifest.json
├── sw.js              # Service Worker（詳細コメント付き）
├── js/
│   ├── app.js         # メインアプリケーション
│   ├── install.js     # インストール処理
│   └── push.js        # プッシュ通知処理
├── css/
│   └── style.css      # 最小限のスタイル
├── icons/             # PWA用アイコン（各サイズ）
├── offline.html       # オフラインページ（シンプル）
└── docs/
    ├── PWA基礎.md     # PWAの概念と仕組み
    ├── Service-Worker解説.md
    ├── プッシュ通知の仕組み.md
    ├── iOS制限事項.md  # iOS特有の制限と対処法
    └── テスト手順.md

### index.htmlの構成例
```html
<!-- 最小限の構成 -->
<body>
  <h1>PWA機能テスト</h1>
  
  <section>
    <h2>インストール</h2>
    <button id="installBtn">PWAをインストール</button>
    <p id="installStatus">ステータス: 未インストール</p>
  </section>

  <section>
    <h2>プッシュ通知</h2>
    <button id="notifyBtn">通知を有効化</button>
    <button id="testNotifyBtn">テスト通知</button>
    <p id="notifyStatus">ステータス: 未設定</p>
  </section>

  <section>
    <h2>オフライン</h2>
    <button id="cacheBtn">キャッシュ更新</button>
    <p id="cacheStatus">ステータス: -</p>
  </section>

  <section>
    <h2>バックグラウンド同期</h2>
    <button id="syncBtn">同期テスト</button>
    <p id="syncStatus">ステータス: -</p>
  </section>
</body>
```

### ドキュメント内容
1. **PWA基礎.md**
   - PWAとは何か
   - 必要な要件（HTTPS、Service Worker、マニフェスト）
   - メリット・デメリット

2. **Service-Worker解説.md**
   - Service Workerのライフサイクル
   - キャッシュ戦略（Cache First、Network First等）
   - デバッグ方法
   - 各コードブロックの詳細解説

3. **プッシュ通知の仕組み.md**
   - Web Push Protocol概要
   - FCM vs Web Pushの違い
   - 必要なAPIエンドポイント設計
   - VAPIDキーの生成方法

4. **iOS制限事項.md**
   - PWAインストールの制限
   - プッシュ通知の制限（iOS 16.4以降の変更点）
   - 回避策と代替案

5. **テスト手順.md**
   - Android実機でのテスト手順
   - Chrome DevToolsでの確認方法
   - トラブルシューティング

### Service Workerのコメント例
```javascript
// Service Worker登録時のコメント例
self.addEventListener('install', (event) => {
  // installイベント：Service Workerが初めてインストールされた時に発火
  // この段階でキャッシュの準備などを行う
  console.log('Service Worker: インストール中...');
  
  event.waitUntil(
    // キャッシュストレージを開く
    // 'v1'はキャッシュのバージョン名（更新時に変更）
    caches.open('pwa-cache-v1').then((cache) => {
      // 必要なファイルを事前にキャッシュに追加
      // オフライン時でもこれらのファイルにアクセス可能
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        '/css/style.css',
        '/js/app.js'
      ]);
    })
  );
});
```

### テスト項目チェックリスト
- [ ] Android ChromeでPWAインストール可能
- [ ] インストールプロンプトが表示される
- [ ] アイコンとスプラッシュスクリーンが正しく表示
- [ ] オフライン時にキャッシュページが表示
- [ ] プッシュ通知の許可が取得できる
- [ ] プッシュ通知を受信できる（要API）
- [ ] 通知バッジが表示される
- [ ] バックグラウンドでの動作確認

### 注意事項
- Service Worker初心者向けに、各処理に詳細なコメントを記載
- GitHub Pages用にbaseURLの設定に注意（'/リポジトリ名/'を考慮）
- プッシュ通知APIは後から統合できる設計にする
- デバッグ用のconsole.logを多めに入れる
- エラーハンドリングを丁寧に実装