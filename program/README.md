# Windows 命令参考

一个 Web 端的 CMD 和 PowerShell 命令查询工具，提供类似 API 文档的搜索体验。支持按命令名称精确查找，也支持按功能描述/关键词进行模糊匹配。

## 功能特性

- **实时搜索** — 输入即搜，无需刷新页面，150ms 防抖
- **模糊匹配** — 输入功能描述（如"网络""端口""进程"）即可找到相关命令
- **来源切换** — CMD / PowerShell / Win+R 运行 / 全部，一键过滤
- **分类筛选** — 20 个分类侧边栏，自由组合过滤条件
- **命令详情** — 展示语法、参数表（可折叠）、使用示例（支持一键复制）
- **代码高亮** — CMD 和 PowerShell 语法分别着色
- **键盘快捷键** — `/` 聚焦搜索框，`Esc` 清空搜索
- **快速清空** — 搜索框内一键清空按钮
- **推荐搜索** — 无结果时显示热门命令推荐
- **统计面板** — 侧边栏显示各来源命令数量统计
- **回到顶部** — 滚动后显示回到顶部按钮
- **卡片动画** — 搜索结果渐入动画，来源对应主题色
- **响应式布局** — 桌面 / 平板 / 手机三档适配

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 后端 | Python Flask 3.x | 单文件应用，读取 JSON 数据注入页面，gzip 压缩 |
| 搜索 | Fuse.js 7 | 客户端模糊搜索引擎，13KB CDN 加载 |
| 高亮 | highlight.js 11 | 代码语法高亮，深色主题 |
| 样式 | 原生 CSS | CSS Grid 布局 + 自定义属性，无预处理器 |
| 数据 | JSON | 两个 JSON 文件，通过 Jinja2 模板嵌入 HTML |

## 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装与运行

```bash
# 1. 进入项目目录
cd "D:\claude code test\program"

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动服务
python app.py

# 4. 浏览器访问
# http://127.0.0.1:5000
```

服务器默认运行在 `http://127.0.0.1:5000`，启动后直接在浏览器打开即可。

## 项目结构

```
program/
├── app.py                         # Flask 应用入口
├── requirements.txt               # Python 依赖
├── README.md                      # 本文件
├── data/
│   ├── cmd_commands.json          # 101 条 CMD 命令数据
│   ├── powershell_commands.json   # 141 条 PowerShell 命令数据
│   └── run_commands.json          # 103 条 Win+R 运行命令数据
├── static/
│   ├── css/
│   │   └── style.css              # 完整样式（427 行）
│   └── js/
│       └── app.js                 # 搜索/过滤/渲染逻辑（371 行）
└── templates/
    └── index.html                 # Jinja2 页面模板
```

## 命令数据统计

| 来源 | 命令数 | 分类数 |
|---|---|---|
| CMD | 101 | 6（文件与目录操作、系统信息与管理、网络相关、磁盘管理、进程与服务、批处理脚本） |
| PowerShell | 141 | 8（文件与目录操作、系统管理、网络、对象操作、远程管理、模块与帮助、安全、变量与会话） |
| Win+R 运行 | 103 | 8（系统工具、管理控制台、控制面板、应用程序、网络工具、文件管理、Shell 命令、系统路径） |
| **合计** | **345** | **20** |

## 使用指南

### 搜索命令

在顶部搜索框输入关键词，支持：

- **命令名称**：输入 `ipconfig`、`Get-Process`、`regedit` 等精确匹配
- **功能描述**：输入 `网络` 查找所有网络相关命令（ipconfig、ping、netstat、mstsc 等）
- **英文关键词**：输入 `network`、`process`、`file`、`registry` 等英文标签
- **混合匹配**：中文和英文均可，Fuse.js 会自动跨字段搜索

### 来源切换

搜索框右侧有四个按钮：

- **全部**：同时显示 CMD、PowerShell 和运行命令
- **CMD**：仅显示 CMD 命令
- **PowerShell**：仅显示 PowerShell 命令
- **运行**：仅显示 Win+R 运行对话框命令

### 分类过滤

左侧边栏列出所有命令分类，每项显示该分类下的命令数量。可以：

- 勾选/取消勾选单个分类
- 点击「全选」恢复默认
- 点击「取消」清空所有分类

### 查看命令详情

每条命令以卡片形式展示：

- **语法**：深色代码块，鼠标悬停显示复制按钮
- **参数列表**：点击「▶ 参数列表」展开参数表格，标注必选/可选
- **使用示例**：多个示例，每个均可一键复制

### 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `/` | 聚焦搜索框 |
| `Esc` | 清空搜索内容 |

## 自定义与扩展

### 添加新命令

编辑对应的 JSON 文件，按以下格式添加：

```json
{
    "name": "命令名称",
    "source": "cmd",
    "category": "file-dir",
    "categoryLabel": "文件与目录操作",
    "description": "命令的简要描述",
    "syntax": "命令语法",
    "parameters": [
        {"name": "/p", "description": "参数说明", "required": false}
    ],
    "examples": [
        {"description": "示例说明", "command": "实际命令"}
    ],
    "tags": ["中文标签", "english-tag"]
}
```

字段说明：

| 字段 | 必需 | 说明 |
|---|---|---|
| `name` | 是 | 命令名称（精确匹配权重最高） |
| `source` | 是 | `"cmd"` 或 `"powershell"` |
| `category` | 是 | 分类 key，需与已有分类一致或新增 |
| `categoryLabel` | 是 | 分类的中文显示名 |
| `description` | 是 | 一句话描述 |
| `syntax` | 是 | 完整语法 |
| `parameters` | 是 | 参数数组，可为空数组 `[]` |
| `examples` | 是 | 示例数组，可为空数组 `[]` |
| `tags` | 是 | 关键词数组，中英文皆可，用于模糊搜索 |

### 添加新分类

在 JSON 中添加命令时使用新的 `category` 和 `categoryLabel` 即可，前端会自动识别并显示在侧边栏。

### 修改 Fuse.js 搜索行为

编辑 `static/js/app.js` 中的 `initFuse()` 函数：

```javascript
threshold: 0.4,      // 0.0=精确 1.0=匹配一切
ignoreLocation: true, // 匹配字符串中任意位置
```

## 许可证

MIT License
