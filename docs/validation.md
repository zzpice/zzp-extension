# 验证记录

2026-10-15，已发布 0.1.3，只保留 Firefox 新标签页与自动更新。

## 扩展源码与安装包

- TypeScript、格式、构建审计、四项发布结构测试均通过。Mozilla lint 为 0 错误、0 警告、0 提示。
- 未签名构建合计 7.28 kB，仅 manifest、新标签页 HTML/脚本及两枚品牌图；无 API/主机权限、后台、内容脚本、命令、设置页、运行时框架、Home 子模块或站点图标。
- [Linux、Mac、Windows 检查](https://github.com/zzpice/zzp-extension/actions/runs/38687513751) 全部通过，对应发布源码提交 `c28327d63e09228964de1082a320c82a47e83a49`。官方 Firefox 独立配置文件验证实际注册的新标签页跳转到 Home，并出现原站搜索界面。本机使用 Firefox 158.0。
- [Mozilla unlisted 签名与发布](https://github.com/zzpice/zzp-extension/actions/runs/38688825981) 成功。签名 XPI 为 15,079 字节；manifest 与受测构建结构一致，其余运行文件逐字节一致，正式源码包与发布提交的全部跟踪文件一致。
- 生产 HTTPS 更新清单提供 0.1.3，其 SHA-256 与下载的签名 XPI 一致。0.1.3 为唯一 latest；旧功能版本保留为草稿，不作为当前下载入口。

## 真实签名升级

[Linux、Mac、Windows 原生升级测试](https://github.com/zzpice/zzp-extension/actions/runs/38689224276) 全部通过：安装真实签名 0.1.2，从已安装扩展的生产 `update_url` 发现并安装 0.1.3，验证稳定 ID、Mozilla 签名、启用状态和新标签页。

同一测试以错误 SHA-256 请求真实 HTTPS 安装包，Firefox 拒绝下载后旧版版本、签名和启用状态保持不变；不修改生产 feed。本机另验证 0.1.1 → 0.1.3 和 0.1.2 → 0.1.3，均通过。所有原生测试使用临时配置文件，不操作个人 Firefox 数据。

## Home、assets 与数据

Home 恢复提交 `35721b6938fdc2648ed70eec9ad030e32d3de90b` 的整个文件树与扩展接入前 `d51c425079c22dce96eb02d75085693be05b84b3` 完全一致。源码、测试、文档、依赖与配置均已恢复，扩展接入文件已删除。

Home 本地质量检查的 50 项单元测试、204 项界面测试、63 项 Worker 测试，以及公开资源扫描、响应式和可访问性检查全部通过；[Home CI](https://github.com/zzpice/zzp-home/actions/runs/38686982572) 的 quality、product、backend 三项全部通过。

已部署恢复后的 Home，Worker 版本为 `efd78d20-a19b-4613-8419-b3f57f88dba8`。生产前端版本 `b1a097f8c1f4871cc96f` 与本地受测构建相同；公开 API 返回 200，未登录管理 API 保持 302 Access 跳转。

assets 未改动，工作树干净，仍位于 `b0bb8d130bc270584e7c3c7a10fd626dbc56a75c`。没有对生产 D1、导航、私人数据或用户草稿执行写入、迁移或清理。
