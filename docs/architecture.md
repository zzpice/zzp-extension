# 架构

扩展只包含新标签页入口和 Firefox 原生更新配置。

`chrome_url_overrides.newtab` 注册随包提供的 `newtab.html`。页面的本地脚本执行 `window.location.replace("https://zzp.moe/")`，进入 Home 的普通 HTTPS 页面，不在扩展权限上下文加载远程代码。HTML 另提供固定 Home 链接。没有 iframe、页面副本、Home 子模块或运行时框架。

搜索、主题、图标和缓存直接由原站实现。Home 更新无需重新打包扩展。网络与离线可用性取决于 Home 现有 Service Worker 和浏览器缓存；扩展不承诺首次离线即可打开未访问过的网站，也不维护自己的离线界面。

扩展不读取当前标签页、不交接收藏、不存储导航、不调用 Home API，也不新增后台服务。Home、assets 及 D1 保持各自原有职责，扩展不部署或修改它们。包内仅保留 48/96px 的扩展身份品牌图，没有站点图标或图标目录。

`release-config.json` 固定扩展 ID、仓库和 HTTPS 更新地址。GitHub Actions 构建并向 Mozilla 提交 unlisted 签名，签名后生成版本与 SHA-256 清单。Firefox 原生更新器负责下载、验证和替换扩展，无更新轮询脚本或平台专用程序。

构建审计要求包内只有 manifest、新标签页 HTML/脚本和两枚品牌图，拒绝后台、内容脚本、权限、命令、设置页和多余资源。发布脚本另核对签名包与受测 manifest 一致。

依据：[Mozilla 新标签页覆盖与页面跳转](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides)、[Firefox 扩展更新](https://extensionworkshop.com/documentation/manage/updating-your-extension/)。
