# DJI Osmo Action 4 - 交互式3D结构拆解

## 📦 项目简介

DJI Osmo Action 4 的交互式 3D 结构拆解可视化页面。整机 9 大模块全部由代码程序化建模（Three.js 几何体 + Canvas 程序纹理），不依赖任何外部 3D 模型文件/图片/字体/CDN。

### 9 大模块

1. **防水外壳** - IP68 防水等级，10 米裸机防水
2. **镜头模组** - f/2.8 超大光圈，155° 超广角 FOV
3. **图像传感器** - 1/1.3 英寸 CMOS，4800 万像素
4. **LCD 显示屏** - 后置 2.25 英寸触控屏 + 前置 1.4 英寸自拍屏
5. **锂电池** - 1770mAh / 6.72Wh
6. **主控电路板** - Ambarella A12SE 主控芯片
7. **散热模组** - 铜质散热片 + 热管设计
8. **麦克风模组** - 双 MEMS 麦克风阵列
9. **接口与连接** - USB-C + microSD + WiFi/蓝牙

### 交互功能

- 🔄 拖拽旋转 3D 模型
- 🔍 滚轮缩放
- 📱 点击选择模块查看详情
- 🎚️ 滑块控制拆解/组装程度
- 🏷️ 显示/隐藏模块标签
- 🔄 自动旋转开关

---

## 🚀 部署到 GitHub Pages

### 方法一：自动部署（推荐）

1. **创建 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: DJI Osmo Action 4 3D Teardown"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **启用 GitHub Pages**
   - 进入仓库的 **Settings** → **Pages**
   - **Source** 选择 **GitHub Actions**
   - 保存设置

3. **自动部署**
   - 推送代码到 `main` 分支后，GitHub Actions 会自动构建并部署
   - 部署完成后，访问：`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

### 方法二：手动部署

1. **构建项目**
   ```bash
   npm install
   npm run build
   ```

2. **部署 dist 目录**
   - 使用 `gh-pages` 包：
     ```bash
     npm install -D gh-pages
     npx gh-pages -d dist
     ```
   - 或手动上传 `dist` 目录到 `gh-pages` 分支

---

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 📁 项目结构

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署工作流
├── src/
│   ├── App.tsx                 # 主应用组件（Three.js 场景）
│   ├── modules.ts              # 9 大模块定义
│   ├── textures.ts             # Canvas 程序纹理生成
│   ├── main.tsx                # 入口文件
│   └── index.css               # 全局样式
├── vite.config.js              # Vite 配置（本地开发）
├── vite.config.github.js       # Vite 配置（GitHub Pages）
└── index.html                  # HTML 入口
```

---

## 🎨 技术栈

- **React 18** - UI 框架
- **Three.js** - 3D 渲染引擎
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **TypeScript** - 类型安全

---

## 📝 注意事项

- 所有 3D 模型均为程序化生成，无需外部资源
- 支持桌面端和移动端交互
- 建议使用现代浏览器（Chrome、Firefox、Safari、Edge）
- GitHub Pages 部署会自动处理 base 路径

---

## 📄 License

MIT License

---

## 🙏 致谢

- DJI Osmo Action 4 产品灵感
- Three.js 社区
- React 社区

---

**Enjoy the 3D teardown experience! 🎉**
