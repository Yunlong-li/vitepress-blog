# 我的博客

基于 VitePress 的个人博客。

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

## 部署到 GitHub Pages

项目已包含 `.github/workflows/deploy.yml`。推送到 GitHub 的 `master` 或 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。

如果这是普通项目仓库，例如 `vitepress-blog`，线上地址通常是：

```txt
https://你的用户名.github.io/vitepress-blog/
```

如果仓库名是 `你的用户名.github.io`，线上地址通常是：

```txt
https://你的用户名.github.io/
```

## 目录

- `.vitepress/config.ts`: 站点配置
- `.vitepress/theme/style.css`: 主题样式
- `posts/`: 博客文章
- `posts/notebook.md`: 从旧博客整合过来的笔记归档
- `posts/assets/`: 旧博客笔记中的图片资源
- `public/`: 静态资源
