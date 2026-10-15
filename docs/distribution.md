# 非公开签名与自动更新

采用 Mozilla unlisted 签名 + GitHub Actions + GitHub Releases HTTPS 更新清单。仓库源码和下载链接公开可达，AMO 不公开列出扩展。无需独立更新后台、账户服务、私有下载令牌或平台专用安装程序。

扩展 ID 和更新地址集中在 `release-config.json`，首版分发后保持稳定。Mac 与 Windows 使用同一份签名 XPI。浏览器更新器验证版本、兼容性、Mozilla 签名及清单指定的 SHA-256；下载失败、校验失败或不兼容不会让扩展自行卸载旧版。

## 一次性配置

在 AMO 开发者账户 [API 凭据页](https://addons.mozilla.org/developers/addon/api/key/) 获取 JWT issuer 与 secret，在仓库或 `extension-signing` Environment 中分别保存为 `AMO_JWT_ISSUER`、`AMO_JWT_SECRET`。只通过 GitHub Secrets 配置，不能提交、输出或放进 Release。Mozilla 登录、二次验证与开发者协议由账户持有人完成。

建议给 `extension-signing` Environment 配置维护者审批。普通推送和 PR 不读取签名凭据；签名工作流仅可在 main 手动运行，不支持从分支或 fork 提交公开商店版本。

## 发布一个版本

1. 增加 `package.json` 的稳定三段数字版本，更新 `docs/release-notes.md`，完成检查并提交 main，等待 Linux、Mac、Windows 三项 CI 全部通过。每个签名版本只用一次，失败重签或修复按 Mozilla 实际提交状态选择更高版本，不复用已签名号。
2. 手动运行 `Sign and distribute (unlisted)`，输入与 package.json 完全相同的版本。默认 `publish=false`：完成构建、签名和产物检查，只生成 Actions 产物。
3. 需要分发时使用 `publish=true`。工作流固定 `--channel unlisted`，上传完整可重建源码到 Mozilla；拒绝无签名、ID/版本/清单与受测构建不一致的文件。比较已发布更新，拒绝同版本和降级。
4. 工作流从**签名后**的 XPI 计算 SHA-256，先创建草稿 Release 并上传 XPI、清单、校验和与源码，全部成功后将 Release 发布并切为 latest。之前的 feed 与安装包一直保留。
5. 首次用户在 Firefox 安装签名 XPI。Firefox 自己定期检查更新；也可以在 `about:addons` 的齿轮菜单检查更新。临时安装的开发版本不能用于验证这条正式升级路径。

`publish=false` 也会向 Mozilla 提交该版本，签名成功后不可把相同版本当作新版本再签。可先审核构建，再以 `publish=true` 执行一次完整发布；若已签名仅未发布，使用已审核的同一签名产物恢复草稿 Release，不重新构建/改包。签名文件绝不再修改。

## 失败、恢复与测试

- 签名超时、缺密钥、构建失败和清单检查失败均停止在更新清单切换之前。若 Mozilla 进入人工审核，等待审核完成后恢复既有提交，不用新版本覆盖仍待处理的发布。
- 每个版本使用独立下载路径，不能覆盖旧 XPI。旧更新清单若被 CDN 缓存，只会延迟升级。`update_hash` 来自签名产物，避免把旧缓存内容当成新版安装。
- 发布后若发现产品问题，发布更高版本修复；Firefox 不自动降级。必须保留原更新地址；更换仓库或托管前，先通过旧 feed 发布携带新 update_url 的过渡版本。
- Mac、Windows 各用独立测试配置文件安装旧签名 XPI，检查更新，确认新版 ID、版本、签名、启用状态与新标签页正常。将下载地址或 hash 改为无效的**测试 feed**，确认旧版仍可用；不得用生产 feed 试错。
- 自动化覆盖包结构、版本递增、签名标记、精确 hash 与受测 manifest 一致性；只有实际 Mozilla 签名及两版本升级成功后，才能记录为正式升级验证。结构测试不会假称密码学签名验证，真正验证由 Firefox 完成。

`Verify signed Firefox update` 手动工作流在 Linux、Mac、Windows 的独立配置文件中安装较旧的真实签名产物，使用已安装扩展的 `update_url` 发现并安装当前版本，同时检查 Mozilla 签名、启用状态和新标签页打开现有 Home。输入旧签名工作流 run ID、旧版本与当前 feed 版本。另以同一 HTTPS 安装包和错误 hash 测试原生下载器拒绝安装、旧版保持启用；不修改生产清单。源码烟雾测试仍使用临时安装，不把它当作正式升级验证。

## 将来上架

保持当前稳定 ID 和源码可重建。未来明确决定公开上架后，在 AMO 申请 listed 分发并按商店要求提交审核，构建时移除自托管 update_url，让新安装由 AMO 更新。旧自分发 feed 保留，分发同 ID 的商店签名过渡版本，直到已安装用户迁移。当前工作流故意没有 listed 选项。

依据：[Mozilla 签名与分发](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)、[HTTPS 更新清单](https://extensionworkshop.com/documentation/manage/updating-your-extension/)、[源码提交](https://extensionworkshop.com/documentation/publish/source-code-submission/)。
