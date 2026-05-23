# SiYuan Kernel 命令行参数说明

## 概述

SiYuan Kernel 是 SiYuan 笔记应用的核心服务，可以通过命令行参数来控制其启动和运行行为。本文档详细说明了所有可用的命令行参数。

## 参数列表

### 1. `--workspace`

**类型**: 字符串  
**默认值**: `~/SiYuan/`  
**环境变量**: `SIYUAN_WORKSPACE_PATH`  
**说明**: 工作区目录路径，用于存储用户的笔记和配置文件。

**示例**:
```bash
./SiYuan-Kernel.exe --workspace=/path/to/workspace
```

---

### 2. `--wd`

**类型**: 字符串  
**默认值**: `WorkingDir`（系统默认工作目录）  
**说明**: SiYuan 的工作目录。这是应用程序的基础目录，用于查找资源文件、主题和配置等。

**示例**:
```bash
./SiYuan-Kernel.exe --wd=..
./SiYuan-Kernel.exe --wd=/opt/siyuan
```

---

### 3. `--port`

**类型**: 字符串（整数）  
**默认值**: `0`（自动分配可用端口）  
**说明**: HTTP 服务器监听的端口号。设置为 0 时会自动选择一个可用端口。

**示例**:
```bash
./SiYuan-Kernel.exe --port=6806
./SiYuan-Kernel.exe --port=8080
```

---

### 4. `--readonly`

**类型**: 布尔值（true/false）  
**默认值**: `false`  
**说明**: 启用只读模式。在只读模式下，用户无法修改笔记内容，仅能查看。

**示例**:
```bash
./SiYuan-Kernel.exe --readonly=true
./SiYuan-Kernel.exe --readonly=false
```

---

### 5. `--accessAuthCode`

**类型**: 字符串  
**默认值**: 空字符串  
**环境变量**: `SIYUAN_ACCESS_AUTH_CODE`  
**说明**: 访问授权码，用于保护 SiYuan 实例的访问安全。

**特别说明**:
- 在 Docker 容器中部署时，**必须设置**此参数或对应的环境变量
- 详见: [GitHub Issue #9328](https://github.com/siyuan-note/siyuan/issues/9328)
- 可通过设置环境变量 `SIYUAN_ACCESS_AUTH_CODE_BYPASS=true` 跳过空授权码检查（仅用于开发调试）
- 详见: [GitHub Issue #9709](https://github.com/siyuan-note/siyuan/issues/9709)

**示例**:
```bash
./SiYuan-Kernel.exe --accessAuthCode=your-auth-code
# 或使用环境变量
export SIYUAN_ACCESS_AUTH_CODE=your-auth-code
./SiYuan-Kernel.exe
```

---

### 6. `--ssl`

**类型**: 布尔值（true/false）  
**默认值**: `false`  
**说明**: 启用 HTTPS 和 WebSocket Secure (WSS) 协议。启用后，所有通信将使用 SSL/TLS 加密。

**示例**:
```bash
./SiYuan-Kernel.exe --ssl=true
```

---

### 7. `--lang`

**类型**: 字符串  
**默认值**: 空字符串（使用系统语言）  
**环境变量**: `SIYUAN_LANG`  
**说明**: 设置应用界面和提示的语言。

**支持的语言代码**:
- `ar_SA` - 阿拉伯语
- `de_DE` - 德语
- `en_US` - 英语（美国）
- `es_ES` - 西班牙语
- `fr_FR` - 法语
- `he_IL` - 希伯来语
- `it_IT` - 意大利语
- `ja_JP` - 日语
- `ko_KR` - 韩语
- `pl_PL` - 波兰语
- `pt_BR` - 葡萄牙语（巴西）
- `ru_RU` - 俄语
- `sk_SK` - 斯洛伐克语
- `tr_TR` - 土耳其语
- `zh_CHT` - 繁体中文
- `zh_CN` - 简体中文

**示例**:
```bash
./SiYuan-Kernel.exe --lang=zh_CN
./SiYuan-Kernel.exe --lang=en_US
# 或使用环境变量
export SIYUAN_LANG=ja_JP
./SiYuan-Kernel.exe
```

---

### 8. `--mode`

**类型**: 字符串  
**默认值**: `prod`  
**说明**: 运行模式。dev 模式用于开发调试，prod 模式用于生产环境。

**可用选项**:
- `dev` - 开发模式
  - 应用会从工作目录的 `appearance/themes` 和 `appearance/icons` 目录加载主题和图标
  - 适合开发人员调试

- `prod` - 生产模式
  - 应用会从配置目录加载主题和图标
  - 适合最终用户使用

**示例**:
```bash
./SiYuan-Kernel.exe --mode=dev
./SiYuan-Kernel.exe --mode=prod
```

---

## 使用示例

### 示例 1: 基本启动
```bash
./SiYuan-Kernel.exe --wd=.. --mode=dev
```
启动 SiYuan Kernel，工作目录为当前目录的上一级，使用开发模式。

### 示例 2: 自定义端口和工作空间
```bash
./SiYuan-Kernel.exe --port=6806 --workspace=/home/user/my-workspace
```
启动 SiYuan Kernel，监听端口 6806，使用自定义工作空间。

### 示例 3: Docker 部署
```bash
./SiYuan-Kernel.exe --mode=prod --port=6806 --accessAuthCode=my-secure-code
```
以生产模式启动，设置访问授权码（Docker 部署必需）。

### 示例 4: 使用环境变量
```bash
export SIYUAN_WORKSPACE_PATH=/opt/siyuan-workspace
export SIYUAN_LANG=zh_CN
export SIYUAN_ACCESS_AUTH_CODE=my-code
./SiYuan-Kernel.exe --mode=prod --port=6806
```
使用环境变量设置工作空间、语言和授权码。

### 示例 5: 只读模式
```bash
./SiYuan-Kernel.exe --readonly=true --mode=prod
```
启动 SiYuan Kernel 为只读模式。

---

## 环境变量支持

以下参数支持通过环境变量设置（命令行参数优先级更高）：

| 参数 | 对应环境变量 |
|------|------------|
| `--workspace` | `SIYUAN_WORKSPACE_PATH` |
| `--accessAuthCode` | `SIYUAN_ACCESS_AUTH_CODE` |
| `--lang` | `SIYUAN_LANG` |

**注意**: 其他参数（port, readonly, ssl, mode, wd）仅支持命令行参数形式。

---

## 特殊说明

### 工作空间锁定
- 工作区仅允许被一个 Kernel 进程服务，防止数据损坏和冲突

### 主题和图标路径
- **开发模式 (dev)**: `<WorkingDir>/appearance/themes` 和 `<WorkingDir>/appearance/icons`
- **生产模式 (prod)**: `<ConfDir>/appearance/themes` 和 `<ConfDir>/appearance/icons`

### Docker 部署注意事项
- 在 Docker 容器中部署时，**必须设置 `--accessAuthCode` 参数**或对应的环境变量
- 如需跳过此检查（仅用于开发），设置环境变量 `SIYUAN_ACCESS_AUTH_CODE_BYPASS=true`

---

## 参考链接

- [GitHub Issues #9328 - Docker 部署的访问授权](https://github.com/siyuan-note/siyuan/issues/9328)
- [GitHub Issues #9709 - 授权码检查跳过](https://github.com/siyuan-note/siyuan/issues/9709)
