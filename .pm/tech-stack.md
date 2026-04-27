# 技术方案基线（MVP）

## 技术栈建议
- 前端：Next.js + TypeScript
- UI：Tailwind CSS + 轻量组件库
- 后端：Next.js Route Handlers（MVP阶段一体化）
- 数据库：PostgreSQL
- ORM：Prisma
- 鉴权：基于 session/token 的账号系统（支持角色与家庭组）
- 图表：轻量图表库（用于趋势看板）

## 数据与权限设计原则
- 业务数据全表带 `user_id`。
- 家庭关系通过 `family_groups` 与 `family_members` 管理。
- 服务端强制鉴权和权限校验，不依赖前端隐藏按钮。

## 模块拆分
1. `auth`：注册登录、会话管理
2. `family`：家庭组、成员角色、邀请机制
3. `game`：棋局、走子记录、回放
4. `review`：复盘结果、错误标签、建议走法
5. `training`：训练任务、训练记录
6. `dashboard`：统计与趋势查询

## MVP工程策略（低消耗）
- 先单体结构，后续再拆服务。
- 先做可用 API，再逐步增强分析能力。
- 每次只交付一个垂直切片（页面+API+数据表+验收）。

