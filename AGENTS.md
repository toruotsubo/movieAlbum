# movieAlbum

## 概要
electronを利用した動画管理用デスクトップアプリ

## 技術スタック
- electron
- nextjs
- typescript
- tailwindcss

## 機能
- キー項目一覧画面、動画一覧画面、動画詳細画面の3画面構成。
- アプリ内では動画再生はしない。OS標準の動画プレイヤーを起動する。
- 動画ファイルはアプリ内に持たない。ファイルへの参照パスのみ。
- 動画ファイルのメタデータの書き込みはしない。動画にひもづくデータはデータベースで保持する。
- 各動画のデータの項目は「タイトル」「カテゴリ」「名前」「公開年」「公開月日」「評価」「コメント」「ユーザー定義項目(3つまで)」。
- 評価は星5段階。初期値は3。
- 動画サマリー画像は720px×405px。
- 初回起動時に設定モーダルを表示する。
- アプリ画面に動画データをドラッグ・ドロップすると、項目編集モーダルを表示する。
- 詳細は /doc 参照。

## ディレクトリ構造

movieManager/
├── electron/          # Electron メインプロセス & プリロードスクリプト & DB処理
│   ├── db/            # データベース処理 (JSONファイル保存)
│   ├── main.ts
│   ├── metadataParser.ts # 動画メタデータ・フレームレート解析モジュール (Pure Node.js)
│   └── preload.ts
├── src/               # Next.js (フロントエンド) ソースコード
│   ├── app/           # App Router ページ構成
│   │   ├── movies/    # 動画一覧・動画詳細画面
│   │   └── page.tsx   # キー項目一覧画面
│   ├── components/    # UI コンポーネント (KeyItemFormModal, MovieFormModal等)
│   └── lib/           # 型定義 / 共通ユーティリティ (metadataExtractor, legacyMetadataFetcher等)
├── public/            # 静的アセット
├── package.json
└── tsconfig.json

