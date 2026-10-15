# 第三方资源

Home 源码固定在 `vendor/home`，其原有依赖与资源说明见该目录的 THIRD_PARTY_NOTICES.md。扩展自己的代码不另行授予第三方品牌或图片版权。

站点图标逐项来源、处理记录、原始尺寸和已知许可见 `public/attribution/SOURCES.md`、`navigation-sources.json` 与 `public/attribution/licenses/`。全部按 Home 审核目录中的固定提交及 SHA-256 原样复制。品牌权利归各自权利人。扩展工具栏图标由 Home 现有品牌图生成。

运行依赖 React、React DOM、React Router、Lucide 和 Radix Dialog 按各自开源许可使用；Zod 用于沿用 Home 数据校验。版本和传递依赖锁定在 pnpm-lock.yaml；没有运行时 CDN 脚本。
