# 架构与复用

`vendor/home` 是固定提交的 Git 子模块。扩展直接导入 Home 的 SearchPage、SlidingSelection、Modal、偏好读写、IME 保护、导航解析、公开快照缓存与搜索配置，不维护另一套搜索 UI、分类模型或后台。源码包包含该固定版本，普通构建不拉取远端代码。

Home 搜索组件的可选 `source` / `runtime` 参数仅提供公开快照地址、Firefox 默认搜索动作和本地图标路径。普通网页不传扩展参数，行为保持。扩展侧只保留新标签页容器、原生浏览器 API 调用和待收藏队列；导航、项目与管理继续打开 Home 原页面。壁纸、管理副本、浏览器书签导入和网络联想不在扩展中实现。

## 收藏数据路径

1. 用户点击工具栏或快捷键，`activeTab` 只读取这次操作的标题、URL。后台先持久保存单条待收藏，然后绑定新建的 Home 标签页。
2. 仅在 `/admin/` 顶层运行的内容脚本向后台认领该标签页的捕获。标题和网址不放进登录 URL、查询参数或片段。
3. Home 原有 Access 验证完成、工作台可编辑且没有未应用输入或同步冲突后，接收版本化草稿事件。用当前完整导航检测主地址及备用链接重复，按已有域名映射选择图标。
4. Home 将表单输入写入原 IndexedDB 草稿，确认保存成功后回执。新记录默认为私人；同网址打开原记录，保留原公开范围。扩展收到回执后才移除待收藏。
5. 用户在现有 SiteForm 中选择分类、编辑并应用，再通过原同步、冲突处理、CSRF 和 CAS 写入 D1。扩展无管理 API 写入通道。

新标签页只读公开 API，沿用 Home 的 schema、摘要、ETag 校验与 IndexedDB 缓存。界面和图标随扩展安装包离线可用；数据刷新失败保留上一次有效快照。没有第一次成功联网时，仍可使用搜索，但没有收藏缓存。

## 维护上游

显式更新 Home 子模块，运行检查再提交新指针；不要在 CI 跟随 main。Home 不因扩展运行而动态加载代码，也不为扩展放宽 Access、CORS 或写入来源限制。

资源更新：在 assets 本地仓库取回 Home `public/icon-catalog.json` 记录的提交后，执行 `node scripts/sync-assets.mjs /path/to/assets`。脚本从固定 Git 对象读取原文件，验证 SHA-256、PNG、512×512 和 RGBA，再复制许可。不会修改 assets。扩展自身 48/96px 工具栏图标由 Home 品牌图等比缩小，站点图标保持原始 512px。

## 搜索决策

保留 Home 所有配置范围与显式引擎，普通全网搜索新增「Firefox 默认」。请求不传 engine，因此随 Firefox 默认引擎变化；不调用任何修改引擎设置的 API。新标签页不抢地址栏焦点，`/`、`Cmd/Ctrl+K` 聚焦页面搜索，方向键选择、Enter 打开、Escape 退出，沿用中文输入法保护。

不接入网络联想。Google 官方说明自定义搜索 JSON API 不支持自动补全；Bing Search APIs 已在 2025-08-11 退役。Firefox `search` 仅提供获取引擎和执行搜索，没有开放建议接口。使用私人、未文档化端点或增加代理服务都不符合本项目目标。

依据：[Firefox search](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search)、[Google 自动补全说明](https://support.google.com/programmable-search/answer/12459221?hl=en)、[Bing 退役公告](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)。
