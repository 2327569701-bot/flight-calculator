# Flight Calculator iOS Edition

`Flight Calculator iOS Edition` 是 `Flight Calculator` 的 iOS 版本分支，当前由 `zhufeny` 负责适配与维护。

这个版本的目标不是继续延续已经基本废弃的 V1 结构，而是在 V2 重构后的思路上，把新的计算逻辑与界面体验带到 iPhone / iPad。

## 项目定位

- 面向 `MSFS / X-Plane` 用户的飞行辅助计算工具
- 作为桌面版 V2 的 iOS 适配版本独立维护
- 当前采用 `SwiftUI + WKWebView` 的容器方案承载前端页面

## 当前特性

- 下滑角计算
- 垂直速度计算
- TOD 计算
- 航空三角计算
- 燃油相关计算
- 单位系统切换
- 本地预设保存
- 深浅色主题适配

## 项目结构

- `FlightTest.xcodeproj`：Xcode 工程文件
- `FlightTest/FlightTestApp.swift`：iOS 应用入口
- `FlightTest/ContentView.swift`：`WKWebView` 容器与页面加载逻辑
- `FlightTest/WebApp/`：网页层资源
- `FlightTest/WebApp/index.html`：网页入口
- `FlightTest/WebApp/js/`：业务逻辑与计算器脚本
- `FlightTest/WebApp/css/`：样式文件

## 运行方式

1. 用 Xcode 打开 `FlightTest.xcodeproj`
2. 选择模拟器或真机
3. 直接运行项目

## 当前实现说明

目前 iOS 版不是完全原生重写，而是通过 `WKWebView` 加载本地网页资源。

这样做的好处是：

- 可以更快复用 V2 的前端结构
- iOS 和桌面版在计算逻辑上更容易保持一致
- 维护成本比继续修补旧版 V1 更低

## 后续方向

- 继续完善 iPhone / iPad 的显示细节
- 逐步优化更像原生 App 的交互体验
- 根据 iOS 平台能力补充分享、文件导出等功能
- 视维护成本再决定是否进一步原生化

## 分支说明

这个仓库用于 iOS 版本开发，不等同于 Windows 桌面主线。

如果你同时维护主仓库与 iOS 版本，建议：

- `main` 保持桌面版主线
- `ios-edition` 作为 iOS 独立开发分支

## 维护者

- `zhufeny` - iOS 版本适配与更新
- `残月` - 原项目架构与桌面版方向

## License

MIT
