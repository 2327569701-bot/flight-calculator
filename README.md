# Flight Calculator | 飞行计算器

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

傻瓜式飞行计算器，用于模拟飞行中的常见计算。支持 MSFS / X-Plane。

## 功能

- 📐 **下滑角计算** - 根据高度差和距离计算下滑角
- ⬆️ **垂直速度计算** - 根据地速和下滑角计算垂直速度
- 🛬 **TOD 计算** - 计算到目标高度的下降点
- 📊 **三角计算** - 航空三角计算
- ⛽ **燃油计算器** - 含机型数据库

## 单位系统

- 公制 / 英制 / 混合 / 自定义

## 预设管理

预设保存在用户数据目录：
- `profiles/aircraft/` - 机型预设
- `profiles/units/` - 单位预设

## 运行方式

### 桌面版（推荐）

**方式一：浏览器直接打开**
直接双击 `index.html` 打开（预设保存在浏览器 localStorage）

**方式二：Electron 桌面版**
```bash
npm install
npm start
```

### 开发

```bash
# 安装依赖
npm install

# 开发模式（Electron）
npm run dev

# 打包桌面应用
npm run build
```

## 技术栈

- Electron + Node.js（桌面版）
- 原生 HTML/CSS/JS（零依赖）
- 支持 MSFS / X-Plane

## 开源协议

本项目采用 MIT 开源协议。

## 开发者

残月（win）
ZhuFenY（ios）

---

*如果有大佬愿意改进这个项目，非常欢迎！*
