# Flight Calculator | 飞行计算器 V2

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.3-blue.svg)

**专业级飞行计算器** | 适用于 MSFS / X-Plane

---

## 为什么会有 V2？

V1 版本诞生于学习阶段，代码结构混乱、逻辑纠缠，维护成本极高。

继续在屎山上添砖加瓦毫无意义，所以我选择**推倒重来**。

---

## V2 做了什么？

### 底层重构
- **代码全面重写** - 不是修修补补，是彻底的推翻重写
- **配置驱动架构** - 新增计算器仅需修改配置，无需改动核心代码
- **单位系统中间层** - 用户输入自动转换，逻辑统一不出错
- **组件完全隔离** - 每个卡片独立计算，互不干扰

### 新增功能
- **VAPP 进近速度计算** - 波音737-800算法，含风修正和阵风修正
- **风分量计算** - 自动分解顶风/顺风/侧风
- **VREF 参考值查询** - 根据重量和襟翼快速估算
- **飞行手册** - 本地 PDF 导入、阅读与已有 FCOM 参考摘录

### UI 全面升级
- **macOS 风格布局与轻玻璃设计** - 侧栏导航、参数与结果双栏显示
- **动态图形** - 下滑剖面、TOD 时间轴、风分量与速度仪表随计算结果更新
- **分层动态预览** - 保留运动速度的平滑过渡、航迹流光、目标呼吸环、仪表刻度及分批显现的读数，支持暂停与重播
- **系统级深色模式** - 跟随系统自动切换
- **响应式布局** - 桌面、平板、手机完美适配

### 从网页到桌面
- **原生 EXE 版本** - 不再依赖浏览器，直接运行
- **抛弃 Electron** - 转向更轻量的 Tauri
- **更小更快** - 安装包更小，启动更快

---

## 关于技术栈

### 为什么放弃 Electron？

Electron 很成熟，但在国内：
- npm 安装依赖动不动就抽风
- electron-builder 打包体积巨大
- 网络问题导致的各种玄学报错

Tauri 基于 Rust + WebView2，轻量且可靠。

### 新架构

- **Tauri 2.0** - 轻量级跨平台桌面框架
- **原生 Web** - 纯 HTML/CSS/JavaScript，零依赖
- **本地存储** - 所有数据存储于本地，保护隐私

---

## 功能一览

| 计算器 | 说明 |
|--------|------|
| 下滑角 | 高度差+水平距离 → 下滑角（双向计算） |
| 垂直速度 | 地速+下滑角 → 垂直下降率 |
| TOD | 高度差 → 最佳下降点距离/时机 |
| 三角计算 | 速度/距离/时间，任意两值求第三值 |
| VAPP | VREF+风修正+阵风 → 进近速度 |
| 手册 | 导入本地 PDF，查看已有 FCOM 参考摘录 |

---

## 单位系统

支持公制 / 英制 / 混合三种预设，以及完全自定义。

| 模式 | 距离 | 速度 | 高度 | 垂直速度 | 重量 |
|------|------|------|------|----------|------|
| 公制 | km | km/h | m | m/s | kg |
| 英制 | NM | kt | ft | ft/min | lb |
| 混合 | NM | kt | ft | ft/min | kg |

> 混合模式专为混合使用设计：航空专业单位(NM/kt/ft)搭配公制重量(kg)

---

## 运行方式

### 预览当前 UI

直接用浏览器打开 `index.html`，即可预览当前界面。支持浅色 / 深色主题、响应式导航和本地 PDF 手册导入。

修改前端后执行 `npm run build:web`，将入口、样式和脚本同步至 Tauri 使用的 `dist` 目录。`npm run tauri:build` 会先自动执行这一步，再生成桌面安装包；已有 EXE 不会随源码修改而自动更新。

### Windows 直接运行

从 [GitHub Releases](https://github.com/2327569701-bot/flight-calculator/releases/latest) 下载 `Flight-Calculator-V2.exe`，双击即可运行，无需启动网页服务器或安装 Node.js。

本地项目目录中的程序名为 `Flight Calculator V2.exe`；`启动飞行计算器.bat` 和 `npm start` 也会启动它。程序使用 Windows WebView2 Runtime。

### 或安装到系统

运行 `Flight-Calculator_2.0.3_x64-setup.exe` 安装。安装包会检测并安装所需的 WebView2 Runtime。

### 从源码构建 Windows 版本

安装 Node.js、Rust 和 Visual Studio C++ 构建工具后执行：

```sh
npm install
npm run test:diagrams
npm run tauri:build -- --bundles nsis
```

独立程序位于 `src-tauri/target/release/flight-calculator.exe`，安装包位于 `src-tauri/target/release/bundle/nsis/`。构建时会自动将最新前端同步到 `dist`。

请保留仓库中的 `src-tauri/Cargo.lock`：它固定了已验证的依赖版本，包括与 Brotli 兼容的分配器版本。

图形动画回归检查：先运行 `npx playwright install chromium`，再执行 `npm run test:animation`。检查覆盖 9 个模式的计算与清零、中途重新计算、刻度变化及减少动态效果设置。也可以设置 `PLAYWRIGHT_CHANNEL=msedge` 使用已安装的 Edge。

---

## Roadmap

| 版本 | 内容 | 状态 |
|------|------|------|
| V1 | 初版，存在问题 | ❌ 废弃 |
| V2 | 全面重构，桌面版 | ✅ 当前 |
| V2 For iOS | iOS 原生App | 🔄 开发中 |

---

## 团队

- **残月** - 底层架构设计、桌面版开发
- **zhufeny** - iOS 版本适配与更新

---

## 参与项目

欢迎提交 Issue 和 Pull Request！

---

## 开源协议

MIT License - 自由使用、修改、分发

---

*让计算回归简单*
