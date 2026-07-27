# 複数チケットサイト監視

サイト別の監視処理とWorkflowを分離し、LINE通知だけを共通化した構成です。現在はドラチケの2026年8月13日DeNA戦を監視しています。

```text
watchers/
└─ dragons-ticket/
   ├─ config.mjs
   └─ monitor.mjs
shared/
└─ line-notify.mjs
.github/workflows/
├─ dragons-ticket.yml
└─ inventory-query.yml
workers/
└─ line-webhook/
```

Cloudflare Cronから公開リポジトリのGitHub Actionsを5分間隔で起動し、ドラチケへログイン後、「一般チケット」→「一般席」まで進みます。在庫が「なし→あり」または「あり→なし」に変化した場合だけLINE公式アカウントから通知します。カレンダーの「発売中」表示だけでは通知せず、定期的な状態通知も行いません。購入操作そのものは行いません。

## 1. LINEを準備

1. [LINE Official Account Manager](https://manager.line.biz/)で自分用の公式アカウントを作成します。
2. Messaging APIを有効化し、LINE Developersコンソールの「Messaging API設定」でチャネルアクセストークンを発行します。
3. その公式アカウントを自分のLINEで友だち追加します。

通知にはbroadcast APIを使います。公式アカウントの友だち全員に送信されるため、自分以外を友だち追加させないでください。

## 2. GitHubへ登録

このフォルダーを**非公開リポジトリ**としてGitHubへpushします。リポジトリの `Settings` → `Secrets and variables` → `Actions` → `New repository secret` で次を登録します。

| Secret名 | 値 |
|---|---|
| `DRAGONS_LOGIN_ID` | ドラチケの会員証番号またはメールアドレス |
| `DRAGONS_PASSWORD` | ドラチケのパスワード |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIのチャネルアクセストークン |

値をソースコードやREADMEへ書かないでください。

## 3. 動作確認

GitHubの `Actions` → `ドラチケ監視（8/13 DeNA戦）` → `Run workflow` を実行します。成功後はGitHub Actionsが5分間隔で確認します。GitHub側の都合で開始が数分以上遅れる場合があります。

## サイトを追加する

新しいサイトは `watchers/<site-name>/` に設定と監視処理を追加し、`.github/workflows/<site-name>.yml` から個別に実行します。Secrets、通知済み状態、実行間隔はサイト単位で分離し、LINE送信は `shared/line-notify.mjs` を共用します。

## LINEから残席を照会する

Cloudflare WorkerのWebhookを有効化すると、LINE公式アカウントへ次の形式で送信して、指定日の2枚購入可能な一般席を確認できます。

```text
残席 2026/09/01
```

LINE Webhookの署名はChannel secretで検証し、残席確認はGitHub Actionsの `LINE残席照会` Workflowで実行します。結果が届くまで通常1～2分かかります。

誤った認証情報、サイト側のHTML変更、アクセス集中時はWorkflowが失敗します。販売開始とは判定せず、次回に再試行します。通知後は重複送信を防ぐため監視を実質停止します。

## セキュリティ

- リポジトリは必ずPrivateにしてください。
- GitHub ActionsのSecretsはログへ値を表示しません。
- 不要になったらSecretsとLINEアクセストークンを削除・失効してください。
- サイトへ過剰なアクセスをしないよう、監視間隔は5分に固定しています。
