# 验证记录

2026-10-15，本地 Mac：

- 扩展类型检查、搜索与待收藏单元测试通过。覆盖 Firefox 默认搜索、错误保留输入、键盘/指针选择、中文输入法、重复 URL、失败保留待收藏、严格 Home 来源。
- 138 枚原始 PNG 均通过目录 SHA-256、512×512 与 RGBA 检查；安装包扫描通过，未携带私人网址、凭据、远程代码或 favicon/非官方联想请求。
- Mozilla `web-ext lint` 无错误。保留 3 条经过定位的依赖提示：React DOM 的两个内部 __html 分支与 React Router 的框架模块动态导入。应用不使用这些入口；CSP 限制脚本为安装包内。脚本仅接受这些固定依赖位置，其他提示会失败。
- Firefox 157.0.1 临时安装实际包，默认 Google 搜索成功在当前标签页打开；GitHub 匹配到公开收藏，键盘选中 bookmark-0，图标 naturalWidth/naturalHeight 为 512，离线重载可用。
- 官方 Firefox 更新后的 158.0 独立配置文件原生烟雾测试通过：MV3 加载、browser.search.get、深色偏好重载、IME 不提交、离线界面。
- Home：53 项单元测试通过，207 项产品测试中 206 首次通过；1 项 WebKit 离线搜索用例单独复测通过。新增草稿交接在 Chromium、Firefox、WebKit 均通过，验证表单输入进入原 IndexedDB 且不覆盖当前未应用输入。
- Home 的公开资源扫描、响应式及无障碍检查通过，63 项 Worker 浏览器测试通过；草稿接入已通过 Wrangler 部署到 zzp.moe，公开 API 返回 200，未登录管理 API 返回 Access 跳转。
- 发布结构测试覆盖签名标记、manifest 精确一致、签名后 SHA-256、拒绝相同/降低版本及无效版本。测试签名标记为结构夹具，不是可安装签名。

CI 额外在 Linux、Mac、Windows 执行检查和原生 Firefox 烟雾测试，实际结果以对应提交的 Actions 为准。Mozilla 正式签名与连续两版本原生自动升级需要 AMO 凭据和已签名版本，未执行前不视为已验证。
