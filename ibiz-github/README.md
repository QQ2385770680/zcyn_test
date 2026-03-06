# iBizSim 智能决策辅助系统 — GitHub Pages 部署版

本目录是 `ibiz-platform` 的 GitHub Pages 部署副本，已移除 Manus 平台专用依赖，适配静态站点部署。

## 部署地址

`https://QQ2385770680.github.io/zcyn_test/`

## 与 ibiz-platform 的区别

| 项目 | ibiz-platform | ibiz-github |
|------|---------------|-------------|
| 用途 | Manus 原生开发环境 | GitHub Pages 静态部署 |
| vite-plugin-manus-runtime | 包含 | 已移除 |
| Manus Debug Collector | 包含 | 已移除 |
| Analytics 脚本 | 包含 | 已移除 |
| base 路径 | `/` | `/zcyn_test/` |
| 构建输出 | `dist/public` | `dist` |
| SPA 404 fallback | 由 Express 处理 | `404.html` |

## 本地开发

```bash
cd ibiz-github
pnpm install
pnpm dev
```

## 手动构建

```bash
pnpm run build:gh-pages
```

## 自动部署

推送到 `main` 分支的 `ibiz-github/` 目录变更会自动触发 GitHub Actions 构建并部署到 GitHub Pages。

工作流文件：`.github/workflows/deploy-pages.yml`
