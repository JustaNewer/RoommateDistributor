# 智能舍友分配系统 (Intelligent Roommate Allocation System)

一个基于Web的宿舍管理与智能舍友分配系统，利用人工智能技术为用户匹配最适合的舍友，提高宿舍生活体验。

## 目录

- [项目概述](#项目概述)
- [功能特点](#功能特点)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [模块详解](#模块详解)
  - [用户认证模块](#用户认证模块)
  - [宿舍管理模块](#宿舍管理模块)
  - [性格测试模块](#性格测试模块)
  - [智能分配算法](#智能分配算法)
  - [用户档案模块](#用户档案模块)
  - [搜索功能](#搜索功能)
- [安装与配置](#安装与配置)
- [使用指南](#使用指南)
- [API文档](#api文档)
- [贡献指南](#贡献指南)

## 项目概述

智能舍友分配系统是一个解决高校宿舍分配问题的综合性平台。传统的宿舍分配方式往往随机或基于简单规则，容易导致舍友之间的生活习惯冲突。本系统通过AI技术分析用户性格特征和生活习惯，为用户匹配最合适的舍友，提升宿舍生活质量。

系统支持用户创建宿舍、申请加入宿舍、参与性格测试、查看宿舍信息等功能，管理员可以审核申请、分配舍友、管理宿舍等。

## 功能特点

- **用户账户管理**：注册、登录、修改密码、个人资料维护
- **宿舍创建与管理**：创建宿舍、设置宿舍参数（容量、楼层数等）
- **宿舍申请与审核**：用户申请加入宿舍，管理员审核申请
- **AI性格测试**：基于对话形式的性格测试，自动生成用户性格标签
- **智能舍友分配**：基于用户性格标签和生活习惯的智能匹配算法
- **宿舍可视化**：直观展示宿舍布局、房间和床位分配情况
- **搜索功能**：支持通过宿舍名称、学校或哈希码搜索宿舍
- **AI头像生成**：支持AI生成个性化用户头像

## 技术栈

### 前端
- Vue.js (Vue 2)
- Vanilla CSS (自定义样式)
- Axios/Fetch API (网络请求)

### 后端
- Node.js
- Express.js
- MySQL (数据存储)
- JWT (用户认证)

### AI与云服务
- DeepSeek AI API (性格测试)
- 阿里云OSS (头像存储)

## 系统架构

系统采用前后端分离的架构设计：

1. **前端**：基于Vue.js构建的SPA应用，负责用户界面交互
2. **后端**：基于Express.js的RESTful API服务，处理业务逻辑和数据操作
3. **数据库**：MySQL数据库，存储用户数据、宿舍信息、申请记录等
4. **外部服务**：
   - DeepSeek AI API用于性格测试和标签生成
   - 阿里云OSS用于存储用户头像

## 模块详解

### 用户认证模块

#### 功能描述
用户认证模块负责用户注册、登录、密码修改等功能，确保系统安全性。

#### 核心文件
- `src/views/Login.vue`：登录页面
- `src/views/Register.vue`：注册页面
- `src/server/routes/auth.js`：后端认证API

#### 工作流程
1. **注册流程**：
   - 用户提供用户名和密码
   - 后端验证用户名唯一性
   - 对密码进行SHA256加密
   - 将用户信息存入数据库

2. **登录流程**：
   - 用户提交用户名和密码
   - 后端验证凭据
   - 验证成功后，返回用户信息和ID
   - 前端将用户信息存储在localStorage中

3. **密码修改**：
   - 用户提供当前密码和新密码
   - 后端验证当前密码的正确性
   - 更新用户密码

### 宿舍管理模块

#### 功能描述
宿舍管理模块允许用户创建、搜索和管理宿舍，处理宿舍申请和查看宿舍详情。

#### 核心文件
- `src/views/Home.vue`：主页，包含宿舍创建表单
- `src/views/CreatedDorms.vue`：已创建的宿舍列表
- `src/views/DormDetail.vue`：宿舍详情页
- `src/server/routes/dorm.js`：宿舍相关API

#### 数据结构
- **宿舍(Dorms)**：存储宿舍的基本信息（名称、学校、容量等）
- **房间(Rooms)**：存储宿舍内各个房间的信息
- **申请(DormApplication)**：存储用户申请加入宿舍的记录
- **宿舍成员(DormOccupants)**：存储宿舍内成员与房间的分配关系

#### 工作流程
1. **宿舍创建**：
   - 用户填写宿舍信息（宿舍名称、学校、容量、楼层数等）
   - 系统生成宿舍哈希码（用于分享和搜索）
   - 自动创建对应数量的房间记录

2. **宿舍申请与审核**：
   - 用户搜索宿舍并申请加入
   - 宿舍创建者（管理员）查看申请列表并进行审核
   - 审核通过后，用户可以被分配到宿舍房间

3. **宿舍查看**：
   - 用户可以查看已加入的宿舍信息和布局
   - 管理员可以查看宿舍全貌、管理申请和分配房间

### 性格测试模块

#### 功能描述
通过AI驱动的对话式问答，评估用户性格特点和生活习惯，生成性格标签用于舍友匹配。

#### 核心文件
- `src/views/PersonalityTest.vue`：性格测试界面
- `src/server/routes/user.js`：用户相关API，包含与AI的交互

#### 工作流程
1. 用户在个人资料页面点击"开始测试"进入测试页面
2. 系统初始化与DeepSeek AI的对话，设置特定的系统提示词
3. AI提出一系列关于生活习惯、性格特点的问题
4. 用户回答问题，AI根据回答进行评估
5. 测试结束后，AI生成3-5个带有#前缀的性格标签
6. 系统自动提取标签并存储到用户资料中
7. 标签将用于后续的舍友匹配算法

#### AI提示词设计
系统采用精心设计的提示词引导AI进行有效的性格评估，确保：
- 问题具有逻辑性和连贯性
- 至少询问5个问题
- 一次只问一个问题
- 问题聚焦于生活习惯和性格特点
- 最终生成准确的性格标签

### 智能分配算法

#### 功能描述
基于用户性格标签和生活习惯的智能算法，为宿舍分配最合适的舍友组合。

#### 核心文件
- `src/server/routes/dorm.js`：包含`assignRoommatesWithAI`和`fallbackRoommateAssignment`函数

#### 算法策略
1. **AI优先分配**：
   - 基于申请者的性格标签信息
   - 分析标签间的兼容性和冲突点
   - 尝试将具有兼容性格的用户分配到同一房间
   - 避免将有冲突标签的用户分到一起

2. **填满优化策略**：
   - 优先填满已有住户的房间，避免单人住宿
   - 按照填充率排序房间，确保房间被均匀分配
   - 只有最后一个房间允许有空床位

3. **回退策略**：
   - 当AI分配失败或无法获取足够标签信息时
   - 采用基于规则的分配策略
   - 确保房间分配尽可能均匀

#### 分配流程
1. 获取所有已通过审核的申请者信息和性格标签
2. 获取宿舍所有房间信息和当前占用情况
3. 尝试使用AI算法进行最优分配
4. 如果AI分配结果不理想，使用回退算法
5. 验证分配结果，确保无用户被重复分配
6. 更新数据库中的房间分配信息
7. 更新房间占用率统计

### 用户档案模块

#### 功能描述
管理用户个人信息、头像、性格标签等内容，提供个人资料的查看和修改功能。

#### 核心文件
- `src/views/Profile.vue`：个人资料页面
- `src/server/routes/avatar.js`：头像管理API
- `src/server/routes/user.js`：用户标签管理API

#### 功能详解
1. **基本信息管理**：
   - 查看和修改用户名
   - 修改密码

2. **头像管理**：
   - 上传自定义头像
   - 使用AI生成个性化头像
   - 头像存储在阿里云OSS

3. **性格标签管理**：
   - 显示用户的性格标签
   - 重新进行性格测试
   - 查看和管理测试结果

### 搜索功能

#### 功能描述
允许用户搜索宿舍，查看宿舍信息，并申请加入。

#### 核心文件
- `src/views/Home.vue`：包含搜索框
- `src/views/SearchResults.vue`：搜索结果页面
- `src/server/routes/dorm.js`：提供搜索API

#### 搜索方式
- **关键词搜索**：通过宿舍名称或学校名称搜索
- **哈希码搜索**：通过宿舍唯一哈希码直接访问特定宿舍

## 安装与配置

### 前提条件
- Node.js (v14+)
- MySQL (v8.0+)
- npm或yarn

### 数据库配置
1. 创建MySQL数据库`roommateallocation`
2. 导入`database/schema.sql`初始化数据库结构

### 环境变量配置
在`src/server`目录下创建`.env`文件，配置以下变量：
```
# 服务器配置
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=roommateallocation
DB_PORT=3306

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=24h

# DeepSeek AI配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat

# 阿里云OSS配置
OSS_REGION=your_oss_region
OSS_ACCESSKEY_ID=your_accesskey_id
OSS_ACCESSKEY_SECRET=your_accesskey_secret
OSS_BUCKET=your_bucket_name
```

### 安装步骤

1. 克隆项目
```bash
git clone <repository_url>
cd roommate_allocation
```

2. 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd src/server
npm install
cd ../..
```

3. 启动服务
```bash
# 启动前端开发服务器
npm run serve

# 启动后端服务器
npm run server
```

4. 访问应用
浏览器访问 `http://localhost:8080`

## 使用指南

### 用户注册和登录
1. 访问首页，点击右上角的"登录"按钮
2. 如果没有账号，点击"注册"，填写用户名和密码
3. 登录成功后，会自动跳转到首页

### 创建宿舍
1. 在首页点击"创建宿舍"按钮
2. 填写宿舍信息（名称、学校、容量、楼层数等）
3. 点击"创建宿舍"提交

### 参与性格测试
1. 点击个人资料页面中的"开始测试"按钮
2. 回答AI助手提出的问题
3. 完成测试后，性格标签会自动保存到您的个人资料中

### 管理宿舍和申请
1. 点击"我创建的宿舍"查看您创建的宿舍列表
2. 点击具体宿舍可以查看详情和管理申请
3. 在"申请管理"选项卡中可以审核用户申请
4. 点击"分配舍友"按钮可以触发智能分配算法

### 搜索和加入宿舍
1. 在首页搜索框中输入宿舍名称、学校名或哈希码
2. 在搜索结果页面找到目标宿舍
3. 点击"申请加入"按钮提交申请
4. 等待宿舍管理员的审核

### 查看宿舍和房间信息
1. 点击"我加入的宿舍"查看已加入的宿舍
2. 点击具体宿舍可以查看宿舍详情和您的房间分配情况
3. 点击床位可以查看舍友的信息和性格标签

## API文档

系统API主要分为以下几个部分：

### 认证API
- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - 用户登录
- POST `/api/auth/change-password` - 修改密码
- GET `/api/auth/verify-token` - 验证令牌
- POST `/api/auth/logout` - 用户登出

### 宿舍API
- POST `/api/dorm/create` - 创建宿舍
- GET `/api/dorm/created/:userId` - 获取用户创建的宿舍
- GET `/api/dorm/joined/:userId` - 获取用户加入的宿舍
- GET `/api/dorm/:dormId` - 获取宿舍详情
- GET `/api/dorm/search/:query` - 搜索宿舍
- POST `/api/dorm/apply` - 申请加入宿舍
- GET `/api/dorm/:dormId/applications` - 获取宿舍申请列表
- POST `/api/dorm/approve-application` - 批准申请
- POST `/api/dorm/reject-application` - 拒绝申请
- POST `/api/dorm/:dormId/assign-roommates` - 分配舍友
- DELETE `/api/dorm/:dormId` - 删除宿舍

### 用户API
- GET `/api/user/:userId/tags` - 获取用户标签
- POST `/api/user/save-tags` - 保存用户标签
- POST `/api/user/chat/proxy` - 性格测试AI代理
- DELETE `/api/user/chat/history/:userId` - 清除用户对话历史

### 头像API
- POST `/api/avatar/upload` - 上传头像
- GET `/api/avatar/:userId` - 获取用户头像

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

[MIT](LICENSE)

## 联系方式

如有任何问题或建议，请联系项目维护者。
