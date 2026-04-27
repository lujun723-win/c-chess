# 信息架构与权限架构（MVP）

## 角色
- `parent`（家长）
- `child`（孩子）

## 权限规则（默认）
1. 用户仅可读写本人数据（棋局、复盘、训练、统计）。
2. 家长可只读查看孩子学习数据（不修改孩子内容）。
3. 孩子不可查看家长详细学习数据。
4. 非家庭成员之间互不可见。

## 核心实体
- `users`
- `family_groups`
- `family_members`
- `games`
- `game_moves`
- `reviews`
- `mistake_tags`
- `training_tasks`
- `training_records`
- `progress_metrics`
- `rank_profiles`
- `rank_events`

## 数据绑定原则
- 所有业务表必须包含 `user_id`。
- 家庭内查看行为通过 `family_members + role` 判定。
- 任何列表查询默认加 `user_id` 过滤，跨用户查询必须通过显式授权路径。

## 段位评估原则
- 等级由多维指标计算：实战稳定度、复盘质量、训练执行。
- 结果包括：当前段位、当前积分、升级差距、最近波动原因。
- 评估过程可解释，需保留事件日志（`rank_events`）。
