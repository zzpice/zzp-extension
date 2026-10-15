# 权限与隐私

| 权限                | 用途                                              |
| ------------------- | ------------------------------------------------- |
| `activeTab`         | 仅在点击收藏按钮或快捷键时读取当前页标题和 URL    |
| `storage`           | 在浏览器本地保留尚未交接完成的待收藏              |
| `search`            | 获取默认引擎名称，并由 Firefox 执行用户提交的搜索 |
| `https://zzp.moe/*` | 读取公开导航；只在 `/admin/` 顶层页面交接收藏     |

不申请全站访问、history、tabs、cookies、bookmarks、scripting、webRequest 或原生程序权限。不读取网页正文和 favicon，不绕过 Cloudflare Access，也不在扩展保存登录凭据。不支持隐私浏览窗口。

搜索词在用户执行搜索后才交给 Firefox 默认引擎或选定 Home 引擎。没有联网键入建议、遥测、广告和统计服务。公开导航读取会连接 zzp.moe；图标均在安装包中。更新检查由 Firefox 连接 GitHub，签名发布由维护者工作流连接 Mozilla；运行时不向 Mozilla 上传收藏。

待收藏标题、URL 与目标标签页 ID 保存在 `browser.storage.local`，仅在确认 Home 草稿持久保存后删除；手动丢弃前会确认。队列最多 50 项，满时不覆盖现有内容。主题、成人分类显示偏好与经过校验的公开快照保存在扩展自身的浏览器存储。私人完整导航、分类及工作草稿留在 zzp.moe 原有隔离存储，按 Home 原有同步规则进入 D1。

浏览器可以回收本地存储，卸载扩展也会移除其本地待收藏与偏好；重要记录请完成 Home 同步或在 Home 导出草稿。

Firefox 安装声明列出 searchTerms、websiteContent 与 browsingActivity，涵盖用户主动发起的搜索及网址收藏。声明不等于申请自动读取浏览历史的 API 权限。
