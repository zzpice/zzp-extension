# 第三方资源

Home 源码固定在 `vendor/home`，其原有依赖与资源说明见该目录的 THIRD_PARTY_NOTICES.md。扩展自己的代码不另行授予第三方品牌或图片版权。

站点图标不随扩展复制分发；按需读取 Home 固定提交对应的 assets 原始 PNG。逐项来源与许可由 [assets 原记录](https://github.com/zzpice/assets/blob/8876beff485e37cd3c5fed8e2eecea30495f20d4/icons/SOURCES.md) 和固定 Home 子模块中的资源声明维护，不保留另一份目录。品牌权利归各自权利人。扩展工具栏品牌图沿用 Home 现有品牌图。

运行依赖 React、React DOM、React Router、Lucide 和 Radix Dialog 按各自开源许可使用；Zod 用于沿用 Home 数据校验。版本和传递依赖锁定在 pnpm-lock.yaml；没有运行时 CDN 脚本。
