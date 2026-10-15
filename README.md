# Zzp Home for Firefox

Zzp Home 新标签页与收藏草稿。WXT + Firefox Manifest V3 + React + TypeScript + Vite，面向 Mac 与 Windows 的桌面 Firefox 142+。

新标签页原样编译固定版本的 [Zzp Home](https://github.com/zzpice/zzp-home) 搜索页面、引擎配置、本地网站匹配、原有键盘和输入法处理及样式。搜索组件与扩展开发前完全一致；使用 Home 选定的搜索引擎，不增加 Firefox 默认引擎或联网联想。

点击工具栏「收藏到 Zzp Home」或 `Alt+Shift+S`，当前标题和 HTTP(S) URL 会交给 Home 工作台。完成原有 Cloudflare Access 登录后，在 Home 表单选择分类、编辑并应用草稿，再用原有同步保存到 D1。已收藏网址打开原记录；未完成输入不会被覆盖。关闭登录页或离线时，可在扩展新标签页的「设置 → 待收藏」继续。

站点图标按需使用 Home 已有的 [assets](https://github.com/zzpice/assets) 固定提交原始 512×512 PNG 路径，复用浏览器图片缓存。安装包不包含整套图标、精灵图或另一份目录。缓存不可用、离线或图标缺失时显示文字，不请求 favicon。首次联网后缓存公开导航和搜索配置。私人收藏仍在 Access 工作台使用，扩展不缓存私人管理快照。

## 开发

需要 Node.js 24 和 pnpm 10.34.6；发布辅助与原生测试使用 Python 3 标准库。

```sh
git clone --recurse-submodules https://github.com/zzpice/zzp-extension.git
cd zzp-extension
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm check
python3 -m unittest discover -s tests -p 'test_*.py'
pnpm lint:extension
pnpm zip
```

临时调试：Firefox `about:debugging` →「此 Firefox」→「临时载入附加组件」→ 选择 `.output/firefox-mv3/manifest.json`。临时安装不验证正式签名和自动更新，重启后会移除。

原生烟雾测试需要 Mozilla 官方 Firefox 与 geckodriver，设置 `FIREFOX_BINARY`、`GECKODRIVER_BINARY` 后运行 `python3 scripts/test_firefox.py`。使用独立临时配置文件；不会操作个人浏览器设置。CI 在 Linux、Mac、Windows 运行相同检查和原生加载测试。

## 分发

Mozilla **unlisted** 签名后通过 GitHub Releases 链接分发，不上架商店。首次安装签名 XPI，之后由 Firefox 自带更新器检查 HTTPS 清单、签名、版本及 SHA-256。Mac、Windows 共用一份安装包，不额外运行更新服务。

安装：从 [最新版本](https://github.com/zzpice/zzp-extension/releases/latest) 下载 `.xpi`，在 Firefox 打开 `about:addons` → 齿轮菜单 →「从文件安装附加组件」，选择该文件并确认。新标签页更改提示中选择保留 Zzp Home。后续保持 Firefox 的附加组件自动更新开启即可。

代码提交只触发检查。签名与分发通过手动工作流，默认只生成签名产物；详情见 [分发与更新](docs/distribution.md)。未经确认，不执行公开上架流程。

- [架构与复用](docs/architecture.md)
- [权限与隐私](docs/privacy.md)
- [分发与更新](docs/distribution.md)
- [验证记录](docs/validation.md)
- [第三方资源](THIRD_PARTY_NOTICES.md)
