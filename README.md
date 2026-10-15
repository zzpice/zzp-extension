# Zzp Home for Firefox

只做两件事：Firefox 新标签页打开现有 [Zzp Home](https://zzp.moe/)，通过 Firefox 自带更新器自动升级扩展。支持 Mac 与 Windows 桌面 Firefox 142+。

新标签页直接进入 `https://zzp.moe/`。搜索、主题、导航、图标、离线缓存、Access 登录和数据同步全部使用 Home 原站现有行为。扩展没有另一份页面、设置、图标库或数据存储，也不改变浏览器默认搜索引擎。

WXT + Firefox Manifest V3 + TypeScript + Vite。只有一个跳转入口；没有运行时框架、后台脚本、内容脚本、工具栏按钮、快捷键、API 权限或主机权限。

## 安装与更新

从 [最新版本](https://github.com/zzpice/zzp-extension/releases/latest) 下载签名 `.xpi`，在 Firefox `about:addons` → 齿轮 →「从文件安装附加组件」中选择该文件。新标签页更改提示中选择保留 Zzp Home。

后续保持 Firefox 附加组件自动更新开启即可。Mozilla **unlisted** 签名，通过 GitHub Releases 链接分发，未公开上架商店。Mac 与 Windows 使用同一份安装包，无额外更新服务。

## 开发与验证

需要 Node.js 24、pnpm 10.34.6；发布辅助和原生测试使用 Python 3 标准库。

```sh
git clone https://github.com/zzpice/zzp-extension.git
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

临时调试：Firefox `about:debugging` →「此 Firefox」→「临时载入附加组件」→ 选择 `.output/firefox-mv3/manifest.json`。临时安装不验证正式签名和自动更新，重启后移除。

原生测试需要 Mozilla Firefox 与 geckodriver，设置 `FIREFOX_BINARY`、`GECKODRIVER_BINARY` 后运行 `python3 scripts/test_firefox.py`。它使用独立临时配置文件，检查浏览器注册的新标签页实际打开 Home。CI 在 Linux、Mac、Windows 执行检查。

代码推送只触发检查。签名和分发由 main 的手动工作流执行；正式升级另外使用真实旧签名包验证。

- [架构](docs/architecture.md)
- [权限与隐私](docs/privacy.md)
- [签名、发布与更新](docs/distribution.md)
- [验证记录](docs/validation.md)
- [资源说明](THIRD_PARTY_NOTICES.md)
