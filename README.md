# 智能舍友分配系统 (Intelligent Roommate Allocation System)

一个基于 Web 的宿舍管理与智能舍友分配系统，结合人工智能技术为用户匹配最适合的舍友，提升宿舍生活体验。系统支持中英文双语切换与亮/暗主题。

## 目录

- [项目概述](#项目概述)
- [功能特点](#功能特点)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [数据库设计](#数据库设计)
- [模块详解](#模块详解)
  - [用户认证模块](#用户认证模块)
  - [用户档案模块](#用户档案模块)
  - [性格测试模块](#性格测试模块)
  - [OCEAN 性格画像引擎](#ocean-性格画像引擎)
  - [宿舍管理模块](#宿舍管理模块)
  - [三层智能舍友分配系统](#三层智能舍友分配系统)
  - [宿舍详情与可视化](#宿舍详情与可视化)
  - [搜索功能](#搜索功能)
- [安装与配置](#安装与配置)
- [使用指南](#使用指南)
- [API 文档](#api-文档)

---

## 项目概述

智能舍友分配系统是一个解决高校宿舍分配问题的综合性平台。传统的宿舍分配方式随机或基于简单规则，容易导致舍友间生活习惯冲突。本系统通过 **三层 AI 分配架构**分析用户性格特征和生活习惯，为每个房间匹配最合适的舍友组合，并自动生成兼容性分析报告。

- **住户**可完善个人信息、参与性格问卷测试、搜索并申请宿舍、查看兼容性报告
- **管理员**可创建宿舍、审核申请、一键触发智能分配、微调床位安排

---

## 功能特点

### 用户与账号
- 注册/登录（密码 SHA256 加密）
- 个人信息管理（真实姓名、身高、体重、性别）
- 睡眠作息设置（入睡/起床时间、午睡习惯）
- 注销账号（事务级联删除全部相关数据）

### 性格测试
- **问卷量表测试**：9 道 Likert 1-5 量表题，生成标准化 9 维性格向量
- **OCEAN 确定性画像引擎**：将 9 维向量映射为 Big Five 五维模型，生成唯一确定的自然语言性格画像（相同向量必然产生完全相同的描述）
- 测试完成后在个人资料页展示性格画像与问卷向量，支持重新测试

### 宿舍管理
- 宿舍创建：设置名称、学校、楼层数、每层房间数、每间容量、**性别（男/女生宿舍）**
- 系统自动批量生成全部房间记录
- 宿舍哈希码：用于对外分享和精确搜索
- 宿舍编辑与删除（含房间动态增删）

### 三层 AI 智能舍友分配
- **Layer 1（算法）**：按作息时间贪心聚类分组，午睡习惯子排序，填满优化
- **Layer 2（AI）**：DeepSeek 分析 OCEAN 向量，在作息组不变前提下优化性格兼容性
- **Layer 3（AI）**：为每个房间生成 ★ 级兼容性报告（优势、摩擦点、相处建议）

### 宿舍详情与可视化
- 楼层/房间/床位布局可视化
- 管理员可拖拽/交换/移除床位
- 悬浮 Tooltip 展示住户**性格画像**和**睡眠时间**
- 房间 📊 报告图标，点击弹窗查看 AI 兼容性报告

### 其他
- 头像上传（阿里云 OSS）& AI 生成头像（硅基流动 Kolors 模型）
- 中英文双语界面（`/` 中文 & `/en/` 英文）
- 亮/暗主题切换

---

## 技术栈

### 前端
- Vue.js 3（SPA，Vue Router，vue-i18n 国际化）
- Vanilla CSS（自定义变量 + 亮/暗主题）
- Fetch API

### 后端
- Node.js + Express.js（RESTful API）
- MySQL 8（数据存储）
- node-fetch（服务端请求 DeepSeek API）

### AI 与云服务
- **DeepSeek API**：舍友分配优化（Layer 2）、兼容性报告生成（Layer 3）
- **硅基流动 Kolors**：AI 头像生成
- **阿里云 OSS**：头像图片存储

---

## 系统架构

```
┌─────────────────────────────────────────────┐
│              前端 Vue.js SPA                 │
│  Home / Profile / DormDetail / CreatedDorms │
│  QuestionnaireTest / JoinedDorms / ...      │
└───────────────────┬─────────────────────────┘
                    │ HTTP/REST
┌───────────────────▼─────────────────────────┐
│          后端 Express.js                     │
│  /api/auth  /api/user  /api/dorm  /api/avatar│
└──────┬─────────────────────┬────────────────┘
       │                     │
┌──────▼──────┐     ┌────────▼────────────────┐
│  MySQL 数据库 │     │      外部 AI 服务        │
│  5 张核心表  │     │  DeepSeek Chat API      │
└─────────────┘     │  硅基流动 Kolors (头像)  │
                    │  阿里云 OSS (存储)       │
                    └─────────────────────────┘
```

---

## 数据库设计

### `Users` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | INT PK | 主键 |
| `username` | VARCHAR | 用户名（唯一） |
| `password` | VARCHAR | SHA256 加密密码 |
| `role` | ENUM | `admin` / `resident` |
| `real_name` | VARCHAR | 真实姓名 |
| `height` / `weight` | VARCHAR | 身高/体重 |
| `gender` | VARCHAR | 性别 |
| `avatar_url` | VARCHAR | OSS 头像地址 |
| `dorm_id` | INT FK | 当前入住宿舍 |
| `user_tags` | TEXT | 性格画像文字（OCEAN 自然语言描述，由问卷自动生成） |
| `user_vector` | VARCHAR | 9 维性格向量（JSON，如 `[3,4,5,2,4,3,4,1,5]`） |
| `sleep_time_start` / `sleep_time_end` | VARCHAR(5) | 入睡/起床时间 `HH:MM` |
| `has_nap` | TINYINT | 是否有午睡习惯 |
| `nap_time_start` / `nap_time_end` | VARCHAR(5) | 午睡时间 |

### `Dorms` 表

| 字段 | 说明 |
|------|------|
| `dorm_id` | 主键 |
| `dorm_name` / `school_name` | 宿舍名称 / 学校 |
| `creator_user_id` | 创建者（FK → Users） |
| `dorm_hash` | 唯一哈希码（用于搜索分享） |
| `space` | 每间容量（2/4/6/8） |
| `floor_count` / `rooms_per_floor` | 楼层数 / 每层房间数 |
| `gender` | 宿舍性别（`male` / `female`） |

### `Rooms` 表

| 字段 | 说明 |
|------|------|
| `room_id` | 主键 |
| `dorm_id` | 所属宿舍（FK） |
| `room_number` | 房间号（如 `101`、`302`） |
| `capacity` / `current_occupants` | 容量 / 当前入住数 |
| `compatibility_report` | AI 生成的兼容性报告文本 |

### `DormApplication` 表

| 字段 | 说明 |
|------|------|
| `application_id` | 主键 |
| `dorm_id` / `user_id` | 目标宿舍 / 申请人（FK） |
| `user_tags` | 申请时的性格画像（冗余存储） |
| `application_status` | `pending` / `approved` / `rejected` |
| `application_time` | 申请时间 |

### `DormOccupants` 表

| 字段 | 说明 |
|------|------|
| `dorm_id` / `user_id` / `room_id` | 宿舍 / 用户 / 房间（三方 FK） |

---

## 模块详解

### 用户认证模块

**核心文件**：`src/views/Login.vue`、`src/server/routes/auth.js`

| 功能 | 说明 |
|------|------|
| 注册 | 用户名唯一校验，密码 SHA256 加密存储，选择角色（admin/resident） |
| 登录 | 验证用户名密码，前端存入 localStorage |
| 修改密码 | 需验证旧密码 |
| 注销账号 | 事务级联删除：申请 → 入住 → 房间 → 宿舍 → 用户 |

---

### 用户档案模块

**核心文件**：`src/views/Profile.vue`、`src/server/routes/user.js`、`src/server/routes/avatar.js`

- 维护真实姓名、身高、体重、性别
- 设置**晚间睡眠时间**（入睡/起床）与**午睡习惯**（开关 + 时间段）
- 上传头像（最大 5MB）或调用 AI 生成个性化头像
- 展示当前**OCEAN 性格画像**文字与问卷向量，支持重新测试

---

### 性格测试模块

**核心文件**：`src/views/QuestionnaireTest.vue`、`src/server/routes/user.js`

系统提供标准化的 9 题问卷测试，用户在个人资料页点击"开始测试"即可进入。

#### 问卷量表测试

9 道题目，每题 1-5 分（Likert 量表），对应 9 个性格维度：

| # | 维度 |
|---|------|
| Q1 | 开放性（Openness） |
| Q2 | 责任心-计划性 |
| Q3 | 安静需求 |
| Q4 | 外向性（Extraversion） |
| Q5 | 责任心-公共事务 |
| Q6 | 宜人性-分享 |
| Q7 | 宜人性-沟通 |
| Q8 | 神经质（Neuroticism） |
| Q9 | 责任心-整洁 |

提交后系统自动生成 9 维向量，并调用 OCEAN 画像引擎生成确定性的自然语言性格画像，同时存入 `user_vector` 和 `user_tags` 字段。

---

### OCEAN 性格画像引擎

**核心文件**：`src/server/utils/personalityProfile.js`

将 9 维量表向量确定性地转化为自然语言性格画像，保证**相同向量必然产生完全相同的描述**。

**转换流程：**

```
9维向量 [q1..q9]
    ↓
映射为 OCEAN 五维原始分
  O = q1
  C = mean(q2, q5, q9)   // 责任心
  E = q4
  A = mean(q6, q7)       // 宜人性
  N = mean(q3, q8)       // 情绪敏感度
    ↓
归一化至 0-100
  norm(x) = (x - 1) / 4 × 100
    ↓
离散化：低(0-30) / 中(30-70) / 高(70-100)
    ↓
固定模板描述 + 原型匹配（8种人格原型，欧氏距离最近）
    ↓
特殊规则注记（如高N+低E → "情绪敏感且内向"）
    ↓
室友推荐建议
    ↓
最终性格画像文本（存入 Users.user_tags）
```

**8 种人格原型**：学术钻研型、社交活力型、自律沉稳型、随和开朗型、安静细腻型、独立自主型、活力创新型、温和均衡型。

---

### 宿舍管理模块

**核心文件**：`src/views/Home.vue`、`src/views/CreatedDorms.vue`、`src/server/routes/dorm.js`

#### 宿舍创建
- 填写宿舍名称、学校、每间容量、楼层数、每层房间数
- **选择宿舍性别**（男生宿舍 / 女生宿舍），保证分配时性别隔离
- 系统生成唯一哈希码，自动批量创建所有房间记录

#### 申请与审批
1. 住户搜索宿舍 → 在宿舍详情页提交申请
2. 管理员在「我创建的宿舍」查看待处理申请列表
3. 可逐个手动审批（通过/拒绝），或一键触发 AI 批量分配

#### 床位微调
管理员分配完成后可手动调整：
- **移动床位**：将住户调至同宿舍内的空床位
- **交换床位**：交换两名住户的床位
- **移除住户**：将住户从当前房间移除

---

### 三层智能舍友分配系统

**核心文件**：`src/server/utils/roommateAssignment.js`

一键触发后，系统依次执行三个层次的处理：

#### Layer 1 — 算法硬约束分组

```
① 解析所有申请者的入睡/起床时间
② 贪心聚类：相邻用户入睡时间差 ≤ 60分钟 且起床时间差 ≤ 60分钟 → 归为同组
③ 组内按午睡习惯子排序（有午睡的聚在一起）
④ 贪心填房：优先填满已有住客房间，避免单人住宿
⑤ 无睡眠数据的"灵活用户"最后填入剩余床位
```

#### Layer 2 — AI 性格兼容性优化

接收 Layer 1 的预分组结果，将每位用户的 OCEAN 向量发送给 DeepSeek，由 AI 根据以下规则进行组内微调：

| 冲突组合 | 说明 |
|---------|------|
| 高N + 高E | 情绪敏感者难以适应外向活跃的室友噪音 |
| 高C + 低C | 整洁自律者与随意者摩擦风险高 |
| O 差异过大 | 生活方式价值观分歧 |
| 高A + 高A | 良好组合，友善协作 |

> AI 分配失败时自动降级为 Layer 1 结果，不影响主流程。

#### Layer 3 — AI 兼容性报告生成

为每个 ≥ 2 人的房间生成约 120 字的中文兼容性报告，包含：

- ★ ~ ★★★★★ 兼容度评级
- 该组合的优势（1-2点）
- 潜在摩擦点（如有）
- 一条相处建议

报告存入 `Rooms.compatibility_report`，管理员与住户均可查阅。

---

### 宿舍详情与可视化

**核心文件**：`src/views/DormDetail.vue`

- 按楼层展示所有房间及床位，已入住床位高亮显示
- **悬浮 Tooltip**：鼠标悬停在床位上，弹出住户的姓名、性别、**性格画像**及**睡眠时间段**
- **兼容性报告弹窗**：房间右上角 📊 图标，点击后弹窗显示 AI 兼容性报告
- 宿舍信息栏展示性别标签（男/女生宿舍）
- 管理员可拖拽床位调换住户

---

### 搜索功能

**核心文件**：`src/views/SearchResults.vue`

- 支持按宿舍名称、学校名称模糊搜索
- 支持通过唯一哈希码精确查找宿舍

---

## 安装与配置

### 前提条件

- Node.js v14+
- MySQL 8.0+
- npm

### 数据库初始化

```sql
CREATE DATABASE roommateallocation;
-- 然后运行 src/server/migrations/ 目录下的迁移脚本
```

### 环境变量配置

在 `src/server` 目录下创建 `.env` 文件：

```env
# 服务器
PORT=3000

# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=roommateallocation
DB_PORT=3306

# DeepSeek AI（用于舍友分配优化与兼容性报告）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat

# 阿里云 OSS（头像存储）
OSS_REGION=your_oss_region
OSS_ACCESSKEY_ID=your_accesskey_id
OSS_ACCESSKEY_SECRET=your_accesskey_secret
OSS_BUCKET=your_bucket_name
```

### 安装与启动

```bash
# 克隆项目
git clone https://github.com/JustaNewer/RoommateDistributor.git
cd RoommateDistributor

# 安装前端依赖
npm install

# 安装后端依赖
cd src/server
npm install
cd ../..

# 启动前端（http://localhost:8080）
npm run serve

# 启动后端（http://localhost:3000）
cd src/server
npm run dev
```

---

## 使用指南

### 住户流程

1. **注册**：选择 `resident` 角色，填写用户名密码
2. **完善档案**：在 Profile 页填写身高、体重、性别、**睡眠时间**
3. **参与性格测试**：在个人资料页点击"开始测试"，完成 9 题问卷后系统自动生成 OCEAN 性格画像
4. **搜索宿舍**：首页搜索框，按名称/学校/哈希码查找
5. **申请加入**：在宿舍详情页点击「申请加入」
6. **等待审批**：管理员通过后，进入「我加入的宿舍」查看房间号和兼容性报告

### 管理员流程

1. **注册**：选择 `admin` 角色
2. **创建宿舍**：填写宿舍参数，选择性别（男/女生宿舍）
3. **管理申请**：在「我创建的宿舍」查看申请列表
4. **分配舍友**：
   - 手动逐个审批，或
   - 点击「AI智能分配」触发三层分配系统
5. **查看结果**：分配结果弹窗展示每个房间的成员及 AI 兼容性分析
6. **微调床位**：在宿舍详情页拖拽/交换/移除住户

---

## API 文档

### 认证 `/api/auth`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/register` | 用户注册 |
| POST | `/login` | 用户登录 |
| GET | `/verify-token` | 验证 Token |
| POST | `/change-password` | 修改密码 |
| POST | `/logout` | 登出 |
| DELETE | `/delete-account/:userId` | 注销账号（级联删除） |

### 用户 `/api/user`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET/PUT | `/:userId/profile` | 获取/保存个人信息 |
| GET | `/:userId/tags` | 获取性格画像 |
| GET | `/:userId/vector` | 获取 9 维性格向量 |
| POST | `/save-vector` | 保存向量并自动生成 OCEAN 画像 |
| POST | `/regenerate-profile` | 重新生成单用户性格画像 |
| POST | `/regenerate-all-profiles` | 批量重新生成所有用户画像 |

### 宿舍 `/api/dorm`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/create` | 创建宿舍（含性别字段） |
| GET | `/created/:userId` | 获取用户创建的宿舍列表 |
| GET | `/:dormId` | 获取宿舍详情 |
| PUT | `/update/:dormId` | 更新宿舍信息 |
| DELETE | `/:dormId` | 删除宿舍 |
| GET | `/search/:query` | 搜索宿舍 |
| GET | `/rooms` | 获取宿舍房间列表（含兼容性报告） |
| GET | `/room-occupants/:roomId` | 获取房间住户信息（含性格画像、睡眠时间） |
| POST | `/apply` | 申请加入宿舍 |
| GET | `/applications/:dormId` | 获取待处理申请列表 |
| PUT | `/application/:applicationId` | 审批申请 |
| POST | `/assign-roommates` | **三层 AI 智能舍友分配** |
| GET | `/room-report/:roomId` | 获取单房间兼容性报告 |
| GET | `/dorm-reports/:dormId` | 获取宿舍所有房间报告 |
| POST | `/reassign-bed` | 移动住户到空床位 |
| POST | `/swap-beds` | 交换两住户床位 |
| POST | `/remove-occupant` | 移除住户 |
| GET | `/joined/:userId` | 获取用户已入住的宿舍 |

### 头像 `/api/avatar`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/upload` | 上传头像到阿里云 OSS |
| GET | `/:userId` | 获取用户头像 URL |
| POST | `/generate` | AI 生成头像（硅基流动 Kolors） |

---

## 许可证

[MIT](LICENSE)
