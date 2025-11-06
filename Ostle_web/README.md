# オストル (Ostle Web)

Next.js 14 + TypeScript で実装した簡易版「オストル」です。Vercel でそのままデプロイできます。

## 開発環境

- Node.js 18 以上推奨
- パッケージマネージャは `npm` 前提

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## ビルド

```bash
npm run build
npm start
```

## デプロイ

### GitHub Pages（推奨）

1. このリポジトリをGitHubにプッシュ
2. リポジトリの **Settings** → **Pages** に移動
3. **Source** で **GitHub Actions** を選択
4. `main` または `master` ブランチにプッシュすると自動でデプロイが開始されます
5. デプロイ完了後、`https://[ユーザー名].github.io/[リポジトリ名]/` でアクセス可能

**重要**: 
- リポジトリ名がサブパスになる場合（例: `username.github.io/Ostle_web`）:
  - `.github/workflows/deploy.yml` の `BASE_PATH: /${{ steps.repo.outputs.name }}` が自動設定されます
  - リポジトリ名が `Ostle_web` の場合、`BASE_PATH` は `/Ostle_web` になります

- ルートドメイン（`username.github.io`）でホストする場合:
  - `.github/workflows/deploy.yml` の `BASE_PATH: /${{ steps.repo.outputs.name }}` を `BASE_PATH: ''` に変更してください

**404エラーが発生する場合**:
1. リポジトリの Settings → Pages で Source が **GitHub Actions** になっているか確認
2. Actions タブでデプロイが成功しているか確認
3. `BASE_PATH` の設定が正しいか確認（リポジトリ名と一致しているか）
4. ブラウザのキャッシュをクリアして再読み込み

### Vercel デプロイ

#### 方法1: GitHub連携（推奨）

1. このリポジトリをGitHubにプッシュ
2. [Vercel](https://vercel.com)にログイン
3. "Add New Project" → GitHubリポジトリを選択
4. Framework Preset: **Next.js** を選択（自動検出されるはず）
5. "Deploy" をクリック

#### 方法2: Vercel CLI

```bash
npm install -g vercel
vercel
```

初回は認証とプロジェクト設定が必要です。以降は `vercel --prod` で本番デプロイ。

**注意**: Vercelでデプロイする場合は、`next.config.mjs` の `output: 'export'` を削除するか、Vercel用の設定に切り替えてください。

## ルール（Python版仕様準拠）

- **盤面**: 7×7の内部5×5が可視領域。外周は捕獲リング（リングゾーン）
- **駒**: W（白/プレイヤー）とB（黒/AI）、穴H（両陣営共通で動かせる）
- **移動**: 上下左右にスライド。押し込みで連鎖移動
- **捕獲**: 押し込みで外周または穴に相手を落とすと取得。自己落ちは相手に加点
- **穴の制約**: 穴は押せず、捕獲にも使えない。隣の空きマスにのみ移動可
- **コウ禁止**: 直前の盤面への完全回帰は禁止
- **勝利条件**: 先に2取得した側の勝ち
- **AI**: ミニマックス（深さ3）で評価関数を使用

## ディレクトリ

- `app/` App Router, `page.tsx` がトップ
- `components/` UI コンポーネント
- `lib/` ゲームロジック
- `public/` 画像やアイコン


