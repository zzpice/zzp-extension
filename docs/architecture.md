# 架构与复用

`vendor/home` 是固定提交的 Git 子模块。扩展直接导入 Home 的 SearchPage、SlidingSelection、Modal、偏好读写、IME 保护、导航解析、公开快照缓存与搜索配置，不维护另一套搜索 UI、分类模型或后台。源码包包含该固定版本，普通构建不拉取远端代码。

Home 的 SearchPage 与扩展开发前逐字节一致。构建时仅指定公开 API 来源和使用原始图标；搜索行为、引擎选择和交互均由 Home 原组件决定。扩展侧只保留新标签页容器与待收藏队列；导航、项目与管理继续打开 Home 原页面。

## 收藏数据路径

1. 用户点击工具栏或快捷键，`activeTab` 只读取这次操作的标题、URL。后台先持久保存单条待收藏，然后绑定新建的 Home 标签页。
2. 仅在 `/admin/` 顶层运行的内容脚本向后台认领该标签页的捕获。标题和网址不放进登录 URL、查询参数或片段。
3. Home 原有 Access 验证完成、工作台可编辑且没有未应用输入或同步冲突后，接收版本化草稿事件。用当前完整导航检测主地址及备用链接重复，按已有域名映射选择图标。
4. Home 将表单输入写入原 IndexedDB 草稿，确认保存成功后回执。新记录默认为私人；同网址打开原记录，保留原公开范围。扩展收到回执后才移除待收藏。
5. 用户在现有 SiteForm 中选择分类、编辑并应用，再通过原同步、冲突处理、CSRF 和 CAS 写入 D1。扩展无管理 API 写入通道。

新标签页只读公开 API，沿用 Home 的 schema、摘要、ETag 校验与 IndexedDB 缓存。界面随扩展安装包离线可用；图标使用浏览器已有图片缓存，不可用时显示文字；数据刷新失败保留上一次有效快照。没有第一次成功联网时，仍可使用搜索，但没有收藏缓存。

## 维护上游

显式更新 Home 子模块，运行检查再提交新指针；不要在 CI 跟随 main。Home 不因扩展运行而动态加载代码，也不为扩展放宽 Access、CORS 或写入来源限制。

## 图标与缓存

原来的 138 枚 PNG 占约 7.3 MiB，而搜索页面只在有匹配结果时显示少量图标；全量复制会增加下载、签名更新和许可目录维护成本，已移除。

复用 Home 的 SiteIcon 与 `data/zzp-home-icons.json` 中固定的 assets 提交。Home 的 768×960 精灵图为每格 96px，扩展为保持原图质量直接使用组件已有的原始 PNG 路径，`loading="lazy"` 按需加载。CSP 从同一份 Home 元数据派生，只允许该固定提交的图标路径；不增加远程主机 API 权限。

Home Service Worker 受 zzp.moe 来源和作用域隔离，不能控制 moz-extension 页面，也不能让扩展读取它的 Cache Storage。扩展沿用浏览器 HTTP 图片缓存，缓存不可用或离线时使用组件原有的文字回退；不复制缓存库、不引入代理、Service Worker 或独立资源更新流程。公开导航的 IndexedDB、ETag 和摘要校验继续直接复用 Home。

图标 revision 随明确审核的 Home 子模块升级，无另一份图标目录或同步脚本。48/96px 扩展工具栏品牌图随包保留。站点原图由 assets 提供，不进行降采样或 favicon 替代。

## 搜索

原样复用 Home 搜索页面和已有配置，不接入浏览器默认搜索 API、额外快捷键、指针选择增强或联网联想。原本就有的本地收藏匹配、键盘选择、输入法保护与搜索命令继续由 Home 提供。

依据：[Service Worker 来源与作用域](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)、[扩展非脚本 CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy)。
