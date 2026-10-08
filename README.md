# Flight Calculator | 飞行计算器 V4

适用于 MSFS / X-Plane 的 Windows 飞行计算工作台。V4 将一次飞行的参数保存在本机，并按需带入各个计算器。项目采用 Tauri 2 + WebView2，前端为原生 HTML、CSS 和 JavaScript。

> 仅供模拟飞行与学习。公式中的经验估算、输入的 VREF 和天气报文都不能替代适用机型手册与正式航前资料。

## V4 新增

- **本次飞行**：填写机场、跑道、气压、温度、高度、地速、风等信息。应用以 ft、kt、hPa 等基准单位保存，切换显示单位后仍表示相同的物理量。
- **参数联动**：将会话数据带入压力高度、密度高度、真实空速、TOD、垂直速度、风分量及 VAPP。带入后仍可在计算器里修改。
- **METAR**：桌面版按四字 ICAO 查询美国航空气象中心的单机场报文；显示原文、观测时间和各自动填写值的来源。十分钟内不重复请求同一机场，超过 90 分钟的报文不自动填写；断网时可手动输入。网页版维持手动填写。
- **机型档案与备份**：保存机型、VREF、IAS、单位设置；支持导入／导出会话与完整备份（含会话、档案、历史）。档案保存在本机。
- **ChartFox 并排查看**：保留独立航图窗口，新增宽屏下一键并排。ChartFox 账号登录始终在其官网完成，本程序不读取密码、抓取或重分发航图。请遵守 [ChartFox 使用条款](https://chartfox.org/legal/terms)。
- **计算规则整理**：VAPP 只计算“手动提供的 VREF + 修正值”；旧版未经手册核实的自动风修正和 VREF 估算不再用于新计算。旧版进近速度历史标记为“旧版算法”。用地速和下滑角求垂直速度时使用正切关系。
- **权限收紧**：主 WebView 保留需要的 Tauri 权限，第三方航图 WebView 不获得本地文件权限。

## 计算器

| 工具 | 输入与结果 |
| --- | --- |
| 下滑角 | 高度差与水平距离求角度，或按角度反算距离 |
| 垂直速度 | 地速与下降角求下降率 |
| TOD | 高度差求下降距离；距离与地速求到达时间 |
| 三角计算 | 速度、距离、时间，任意两项求第三项 |
| 大气·空速 | 压力高度、密度高度和真实空速的简化估算 |
| 进近速度 | 用户提供 VREF 与手动修正值；另有风分量计算 |
| 手册 | 导入并阅读本地 PDF |
| 历史 | 自动保存、复制、导出 JSON／CSV、打印 |
| 在线航图 | 在独立窗口打开 ChartFox 官网 |

三种单位预设为公制、英制和混合，也可单独选择距离、速度、高度、垂直速度与重量单位。真实空速仍使用“每千英尺约增加 2%”的经验估算；密度高度也是近似值，界面会标明。

风分量需要相对跑道的角度。会话若同时填写风向和跑道方向，**两者都必须以真北为基准**；跑道号通常表示磁向，不应直接当作真北方位。

## 下载与运行

从 [GitHub Releases](https://github.com/2327569701-bot/flight-calculator/releases) 下载最新版 Windows x64 免安装 EXE，双击运行。系统需有 WebView2 Runtime。发布页同时提供 SHA-256 校验文件。本项目只分发一个免安装 EXE。

从源码运行时，`npm start` 或 `启动飞行计算器.bat` 会优先启动刚构建的 `src-tauri/target/release/flight-calculator.exe`。

## 开发与验证

准备 Node.js、Rust 和 Visual Studio C++ 构建工具，然后执行：

```sh
npm ci
npm run test:calculations
npm run test:diagrams
npm run test:session
npm run test:ui
npm run test:animation
cargo test --manifest-path src-tauri/Cargo.toml --lib
npm run tauri:build -- --no-bundle
npm run test:desktop
npm run profile:motion
```

浏览器测试使用 Playwright；在已有 Edge 的 Windows 电脑上，可先设置 `PLAYWRIGHT_CHANNEL=msedge`。构建命令先清空并重建 `dist`，再生成独立 EXE。请保留 `src-tauri/Cargo.lock` 以固定已验证的依赖版本。

`test:desktop` 和 `profile:motion` 运行刚构建的 Windows EXE。性能脚本分别记录点击到过渡就绪的耗时，以及玻璃球动画实际运行时的帧间隔；浏览器帧间隔不能单独证明 CPU 或 GPU 利用率余量。

## 项目与授权

本项目采用 [MIT License](LICENSE)。开发与设计：残月；iOS 适配：zhufeny。欢迎提交 Issue 或 Pull Request。
