# Inso / 陈振邦个人网站

静态个人网站，基于 v7，保留黑紫与白紫主题。

网址：https://hypertension42.github.io/inso-personal-site/

## 本地预览

在项目目录运行 `python3 -m http.server 8000`，打开 http://localhost:8000。

## 发布

GitHub Pages 从 `main` 分支的根目录发布。更新 `index.html` 后提交并推送，GitHub 自动部署。

## 验证

运行 `python3 -m unittest discover -s tests -v` 检查内部链接、联系方式与发布资源。
