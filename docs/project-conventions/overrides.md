# プロジェクト固有の技術規約オーバーライド

フレームワーク共通規約に加え、以下を適用する。

## Biome

- `correctness/noSolidDestructuredProps` は無効化する。Next.jsのReact Server Componentでのprops分割をSolidのリアクティビティ規約として誤検出するため。
- `style/noDefaultExport` は無効化する。Next.js App Routerのページ・レイアウト・設定ファイルはdefault exportを要求するため。
- `style/useComponentExportOnlyModules` は無効化する。Next.jsの`metadata`など、ルートモジュールで要求される非コンポーネントexportを誤検出するため。
