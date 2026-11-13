# Flight Calculator · iOS（SwiftUI 原生版）

飞行计算器 V4 的 **SwiftUI 原生复刻**。纯 Swift 实现，不再依赖 Tauri / WebView / Rust，界面、公式、单位系统与 V4 对齐。

## 打开与运行

1. 双击 `FlightCalculator.xcodeproj`（或 `xed .`）。
2. 顶部 Scheme 选 **FlightCalculator**，目标设备选任意 iPhone 模拟器。
3. 按 `⌘R` 运行。真机运行需在 **Signing & Capabilities** 里选自己的 Team，并把 Bundle Identifier 改成你自己的（默认 `flc.cz.swift`）。

> 工程由 `project.yml` 通过 `xcodegen` 生成。改了 `project.yml` 后执行 `xcodegen generate` 重新生成 `.xcodeproj`。

## 目录

```
FlightCalculator/
├── project.yml                 # xcodegen 工程描述
├── FlightCalculator.xcodeproj  # 生成的工程
└── Sources/
    ├── App.swift               # @main
    ├── RootView.swift          # 顶栏 + 底部导航 + 路由
    ├── Theme.swift             # 设计 token（亮/暗）与 .panel()
    ├── Units.swift             # 单位系统（公制/英制/混合，逐项切换）
    ├── CalculatorData.swift    # 7 个计算分区 + 公式（Formulas）
    ├── FlightSession.swift     # 本次飞行会话模型 + METAR 服务
    ├── Stores.swift            # 历史记录（50 条）+ 机型档案
    ├── AppModel.swift          # 路由 / 草稿 / 结果 / toast
    ├── Components.swift        # PageHeading、按钮、输入框、toast 等
    ├── CalculatorPage.swift    # 计算器页（字段 + 模式 tab + 结果）
    ├── DiagramView.swift       # 下滑角示意图
    ├── SessionPage.swift       # 本次飞行（表单/概览/带入计算器/档案）
    ├── HistoryPage.swift       # 历史记录（复制/导出/打印/清空）
    ├── ChartsPage.swift        # 航图（ChartFox）
    ├── ManualPage.swift        # 飞行手册
    └── SettingsView.swift      # 单位与预设设置
```

## 与 V4 的对应

- **7 个计算分区**：下滑角、垂直速度、下降顶点、三角、大气·空速、进近速度、飞行手册。
- **公式**与 `js/calculator-data.js` 一致（下滑角/下滑距离/垂直速度/TOD/三角/VAPP/风分量/压力高度/密度高度/真实空速）。
- **单位系统**：公制 / 英制 / 混合预设 + 5 类单位逐项切换，标准单位 NM / kt / ft / ft/min / kg。
- **本次飞行**：16 字段会话、METAR 读取（aviationweather.gov）、会话概览、8 个「带入计算器」、机型档案、导出/导入。
- **历史记录**：最多 50 条，去重、复制、导出 JSON/CSV、打印、清空。
- **主题**：跟随系统，可手动切换亮/暗。

## 说明

- 最低部署目标 iOS 15.0。
- 数据全部本地存储（`UserDefaults`），不联网（仅 METAR 读取时请求 aviationweather.gov）。
