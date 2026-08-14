# 辅导员 Agent 工作台

> 面向高校辅导员的本地化智能工作台，集成学生台账管理、AI 辅助问答、学生温暖陪伴与困难自动预警。深色简洁 UI + 多账号 + 主题切换 + 自定义头像，开箱即用。

---

## ✨ 功能一览

| 模块 | 说明 |
|---|---|
| 🏠 工作台总览 | 六类台账统计卡片 + 就业率 / 心理预警 / 考勤 / 成绩分布可视化，无数据时显示优雅占位 |
| 📚 六类台账 | 学生信息、就业、心理、谈心谈话、学业成绩、课程考勤 —— 搜索 / 增删改 / 内嵌图表 |
| ⬆️ 文件导入 | Excel / Markdown / LaTeX / PDF / Word / PPT，表头模糊匹配 + 自动定位 + 失败报错 |
| ✦ AI 助手 | 50+ 轮长上下文（rolling summary）；对内查本地真实台账、对外答学校事务 |
| 🧑 学生陪伴 | 学号 + 密码登录的专属温暖对话环境；AI 主动了解爱好、给出针对性建议 |
| 🚨 困难预警 | 对话中检测学业 / 家庭 / 经济 / 心理压力 → **双轨同步**：①铃铛红点提示 ②自动写入心理 / 谈话台账「待跟进」 |
| 🔒 内外隔离 | 内部数据需辅导员账号登录；对外公开咨询入口（#/public）完全无法访问内部数据 |
| 👤 辅导员账号 | 注册 / 登录 / 邮箱绑定 / 自定义头像（上传照片或文字） / 5 种主题配色 / 管理员可启停其它账号 |
| 🖼 头像 | 支持上传自己的照片作为头像（JPG / PNG / GIF / WebP / BMP，5MB 以内），或保留文字头像 |
| 🌗 主题切换 | 深邃夜 / 暖夕阳 / 青森林 / 紫罗兰 / 明亮日 五种主题实时切换 |
| 💾 数据持久化 | SQLite 单文件数据库，含台账 + 对话历史 + 学生画像 + 预警通知；schema 变化时自动迁移 |

---

## 🚀 快速开始

### 环境
- Python 3.9+
- Node.js 18+ （仅首次构建前端用，运行不需要）

### Windows 上一键启动
```bat
start.bat
```
首次运行会自动安装后端 + 前端依赖、构建前端、启动服务并打开浏览器。

### 手动启动（任意平台）

```bash
# 1) 后端依赖
cd backend
pip install -r requirements.txt

# 2) 前端构建（首次/前端有更新时）
cd ../frontend
npm install
npm run build

# 3) 启动服务
cd ../backend
python main.py
```

浏览器打开 `http://127.0.0.1:8321`。

### 默认测试账号

| 账号 | 密码 | 姓名 | 角色 |
|---|---|---|---|
| `1403946941` | `1403946941` | 张辅导 | 管理员 |

服务首次启动时自动种子创建。登录后请到「设置 → 个人资料」里改密码、上传头像。

---

## 🌐 三种入口（权限隔离）

| 入口 | 链接 | 适用 | 权限 |
|---|---|---|---|
| 内部工作台 | `http://IP:8321/` | 辅导员 | 账号 + 密码 |
| 对外公共咨询 | `http://IP:8321/#/public` | 学生 / 家长 | 免密，**无任何**内部数据 |
| 学生陪伴 | `http://IP:8321/#/student` | 学生本人 | 学号 + 密码 |

对外入口走独立路由，强制 external 模式，后端不暴露 `[GET /api/ledgers]` 等任何数据接口；学生陪伴模式仅可访问登录本人账号的相关数据。

---

## 🧭 使用流程

1. 双击 `start.bat` 启动 → 浏览器自动打开
2. 用测试账号登录，或注册新辅导员（首个注册者自动成为管理员）
3. 顶栏右上角点圆形头像 → 上传自己的照片 / 切换主题 / 改密码 / 绑定邮箱
4. 「设置」填入 OpenAI 兼容 API Key（DeepSeek / 通义 / Kimi / OpenAI 均可）
5. 「文件导入」上传学生信息 Excel 或 Markdown，表头是 `学号 / 姓名 / 班级` 等中文名即可（届 / 级 / 入学年份都能识别）
6. 「学生账号」按班级一键批量发账号，把 `http://IP:8321/#/student` 发给学生（默认密码 = 学号）
7. 学生进入后聊天 → AI 自动了解爱好 / 困难 → 困难时铃铛闪红 + 心理台账自动登记
8. 「辅导员管理」可启停 / 删除其它辅导员（仅管理员）

---

## 📥 文件导入

首行可以是表头，前面有标题行也能识别；列名模糊匹配（`学生姓名` / `班级（行政）` / `就业状态` / `届` `/ `入学年份` 等变体均可）。

```
| 学号 | 姓名 | 班级 | 就业状态 | 单位 | 地区 |
|---|---|---|---|---|---|
| 2023001 | 张伟 | 计科2301 | 已就业 | 字节跳动 | 北京 |
| 2023002 | 李娜 | 计科2301 | 待就业 | | |
```

**姓名**（成绩需课程名）为必填，缺失行自动跳过。支持表格来源：
- Excel (`xlsx` / `xls`)
- Markdown 表格 (`md`)
- LaTeX `tabular` (`tex`)
- PDF（含文本/表格，自动抽取）
- Word 文档（解析表格）
- PowerPoint 演示文稿（解析幻灯片中的表格 / 文本）

---

## 🤖 AI 长上下文与困难预警

### 长 50+ 轮上下文

- 最近 20 轮原样发给模型
- 超过 30 轮时自动滚动摘要，早期对话被压缩进 `chat_sessions.summary` 写回 SQLite
- 全量历史仍持久化保留，可在「AI 助手」的历史会话中随时翻阅

### 困难检测双轨同步（学生陪伴）

学生陪伴对话中，每轮回复末尾 AI 隐式输出 `<STRUCT>{...}</STRUCT>` 结构化标记（前端自动剥离，用户看不到），含：

```json
{
  "distress": true,
  "distress_type": "心理压力",     // 学业/家庭/经济/心理/选课/人际
  "severity": "预警",              // 关注 / 预警 / 危机
  "evidence": "学生原话片段",
  "suggestion": "建议处置",
  "hobbies": "乒乓球, 编程",
  "interests": "数据科学"
}
```

当 `distress=true`，后端自动：

1. **台账同步**：心理压力 → 心理台账「待跟进」一条；其它压力 → 谈心谈话占位
2. **铃铛报警**：辅导员顶栏铃铛红点 + 抽屉查看证据与 AI 处置建议 + 一键"标记已跟进"

严重度三档：
- **关注** — 一般压力
- **预警** — 明显持续困扰
- **危机** — 有自伤 / 危险迹象，学生侧会显示"我已悄悄联系辅导员"

学生画像也会持续累积：`StudentProfile.hobbies / interests`，下次对话会带上"已知信息"，回答更有针对性。

---

## 🔐 鉴权设计

| 来源 | Header | 用途 |
|---|---|---|
| 辅导员账号 | `X-Counselor-Token` | 工作台所有内部接口 |
| 学生账号 | `X-Student-Token` | 学生陪伴相关接口 |
| 内部老 token | `X-Auth-Token` | 兼容旧版（admin_password），新部署可忽略 |

- 辅导员账号：注册即生成 token，存内存+客户端 localStorage
- 学生账号：辅导员预先发放，可用账号管理页改密码 / 启停 / 删除
- 所有内部接口都走 `require_auth` / `require_counselor` 依赖拦截

---

## 🎨 主题切换

5 种主题实时生效，颜色变量动态注入 `:root`：

| 主题 ID | 名称 | 主色 |
|---|---|---|
| `dark` | 深邃夜 | 蓝 #5b8cff |
| `warm` | 暖夕阳 | 橙 #ff7e5f |
| `green` | 青森林 | 绿 #34d399 |
| `purple` | 紫罗兰 | 紫 #a78bfa |
| `light` | 明亮日 | 蓝白 |

---

## 🛠 技术栈

- **后端**：FastAPI + SQLAlchemy + SQLite + `auto_migrate`（自动 ALTER TABLE ADD COLUMN）；文件解析用 pandas / openpyxl / python-docx / python-pptx / pdfplumber
- **前端**：React + Vite + ECharts，深色风格，全程 SVG 线性图标，零 emoji
- **AI**：OpenAI 兼容 API + Function Calling；学生模式用结构化输出做静默预警
- **头像**：图片上传走 multipart，存 `backend/data/avatars/`，文件名 = `account_id + 随机串`，防枚举

---

## 📁 项目结构

```
辅导员工作台/
├── start.bat              # 一键启动脚本
├── README.md
├── backend/
│   ├── main.py            # FastAPI 入口（含 seed 测试账号）
│   ├── database.py        # 引擎 + auto_migrate
│   ├── models.py          # 6 类台账 + 学生 / 预警 / 辅导员账号
│   ├── schemas.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── ledgers.py        # 6 类台账 CRUD
│   │   ├── files.py          # 文件导入
│   │   ├── charts.py         # 可视化数据
│   │   ├── agent.py          # 辅导员 AI 助手 + 对外公共咨询
│   │   ├── students.py       # 学生陪伴
│   │   ├── student_accounts.py
│   │   ├── counselors.py     # 辅导员账号 + 头像上传 + 头像读取
│   │   ├── alerts.py         # 预警通知
│   │   └── auth.py           # 兼容老版 admin token
│   ├── services/
│   │   ├── file_parser.py    # 多格式解析 + 模糊表头匹配
│   │   ├── chart_service.py
│   │   └── agent_service.py  # rolling summary + 学生 STRUCT 解析
│   └── data/                # SQLite + 配置 + 头像（自动生成，不入 Git）
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx          # 路由 + 顶栏 + 主题加载
        ├── api.js           # axios-like 封装 + 鉴权 Header
        ├── components/
        │   ├── Icon.jsx     # SVG 图标集
        │   ├── Avatar.jsx   # 图片 / 文字头像自动判断
        │   ├── ProfileModal.jsx  # 个人资料弹窗（头像上传 + 主题）
        │   ├── AlertBell.jsx     # 顶栏铃铛
        │   ├── EmptyChart.jsx    # 空图表占位
        │   ├── Toast.jsx
        │   └── ErrorBoundary.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── LedgerPage.jsx         # 6 类台账通用页
        │   ├── ImportPage.jsx
        │   ├── ChatPage.jsx           # 辅导员 AI 助手
        │   ├── StudentAccountsPage.jsx
        │   ├── CounselorsPage.jsx     # 辅导员管理
        │   ├── SettingsPage.jsx
        │   ├── LoginPage.jsx          # 登录 + 注册
        │   ├── PublicPage.jsx         # 对外公共咨询
        │   ├── StudentLoginPage.jsx
        │   └── StudentPage.jsx        # 学生温暖陪伴页
        └── styles.css
```

---

## 💾 数据位置

- 数据库：`backend/data/workbench.db`（含全部台账、对话、学生画像、预警、辅导员账号）
- 头像目录：`backend/data/avatars/`（图片本体）
- 配置：`backend/data/agent_config.json`（API Key、学校信息）

⚠️ **删库即重置**——所有数据会丢失。备份就复制整个 `backend/data/` 目录即可。

---

## 🧪 开发模式

```bash
# 终端 1：后端
cd backend
python main.py

# 终端 2：前端热更新
cd frontend
npm run dev     # http://127.0.0.1:5173，已代理 /api 到 8321
```

---

## ❓ 常见问题

**Q：忘了辅导员密码怎么办？**  
A：删除 `backend/data/workbench.db` 重启，会重新进入注册模式。

**Q：学生密码忘了？**  
A：辅导员在「学生账号」页直接编辑表格里的"密码"单元格，点保存即可。

**Q：能联网用吗？**  
A：所有功能本地跑，只有 AI 调用需要 OpenAI 兼容 API 联网。后端监听 `0.0.0.0:8321`，同一局域网内可共享。

**Q：怎么扩展新的台账字段？**  
A：改 `backend/models.py` 加 column，重启服务时 `auto_migrate` 会自动 `ALTER TABLE` 追加列与索引，旧数据不丢。

**Q：升级更新怎么搞？**  
A：`git pull` → 重跑 `start.bat` 即可。自动迁移会保证数据库平滑升级。

---

## 📜 License

仅供学习与内部使用。如需二次开发并对外发布，请评估学生数据合规性并加正式鉴权层。

---

## 🤝 致谢

- 技术栈：FastAPI / React / Vite / ECharts / OpenAI 兼容 API
- 灵感：opencode / codex 的桌面 UI 风格
- 送给每一位用心陪伴学生成长的辅导员 ❤️