## 目录结构

```
siyuan/app/
├── appearance/              # 应用外观资源
│   ├── boot/               # 启动画面
│   │   ├── icon.png
│   │   └── index.html
│   ├── emojis/             # 表情符号
│   ├── fonts/              # 字体文件
│   │   ├── JetBrainsMono-2.304/
│   │   ├── LxgwWenKai-Lite-1.501/    (中文字体)
│   │   └── Noto-COLRv1-2.047/
│   ├── icons/              # 图标集合
│   │   ├── ant/            # Ant Design 图标
│   │   ├── material/       # Material Design 图标
│   │   └── index.html
│   ├── langs/              # 语言翻译文件 (16 种语言)
│   │   ├── zh_CN.json, en_US.json, ja_JP.json
│   │   └── ... 其他语言
│   ├── themes/             # 应用主题
│   │   ├── daylight/       # 亮色主题
│   │   └── midnight/       # 暗黑主题
│   └── LICENSE
├── src/                     # 前端源代码 (TypeScript/Vue)
│   ├── ai/                 # AI 功能模块
│   ├── asset/              # 资源管理
│   ├── block/              # 块编辑
│   ├── boot/               # 启动逻辑
│   ├── editor/             # 编辑器
│   ├── protyle/            # 原生 Markdown 编辑器
│   ├── search/             # 搜索功能
│   ├── sync/               # 同步功能
│   └── ... 其他功能模块
├── stage/                   # 前端构建输出目录
│   ├── build/              # 构建文件
│   ├── images/             # 图片资源
│   ├── protyle/            # 编辑器资源
│   ├── manifest.webmanifest# PWA 清单
│   └── ... HTML/CSS/JS 文件
├── electron/               # Electron 主进程代码
│   ├── main.js
│   ├── boot.html
│   └── ... 其他文件
├── scripts/                # 构建脚本
├── nsis/                   # Windows 安装程序配置
├── appx/                   # Windows 应用商店配置
├── changelogs/             # 更新日志
├── webpack.*.js            # Webpack 构建配置
├── package.json            # npm 依赖配置
└── ... 配置文件
```

## 关键内容说明

| 目录 | 用途 |
|------|------|
| **appearance/** | 存放所有 UI 相关资源：主题、图标、字体、启动画面、多语言 |
| **src/** | 前端应用源代码（TypeScript 编写）|
| **stage/** | 前端编译输出，包含可直接运行的 HTML/CSS/JS |
| **electron/** | Electron 框架的主进程代码（创建窗口等） |

## 开发模式 vs 生产模式

在 `--mode=dev` 时，应用会从以下位置加载资源：
- **主题和图标**: `<wd>/appearance/themes` 和 `<wd>/appearance/icons`

这样开发者可以即时修改主题和图标，重启应用后立即看到效果，无需重新编译整个应用。

在生产模式下，这些资源会被打包到应用发行版中。