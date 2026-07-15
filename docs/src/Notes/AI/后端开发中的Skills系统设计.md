---
title: 后端开发中的Skills系统设计
desc: 利用AI大模型的Skills系统来规范和约束后端开发流程。通过全局Rules和分类Skills，让大模型在处理需求时更加专业、规范，避免发散思维。
tags: AI
updateTime: '2026-02-23 00:25'
---

## 背景

在使用大模型进行后端开发辅助时，我们经常遇到一个问题：**大模型很喜欢发散**，它会自己去理解代码、阅读文档，但这样往往导致：

1. 🔄 重复的逻辑处理
2. 📝 不符合项目规范的代码生成
3. ⚠️ 对现有代码兼容性考虑不周
4. 🎯 偏离实际需求

为了解决这些问题，我们需要设计一个**Skills系统**，让大模型按照我们的规范进行工作。

## 全局Rule：Skills的准入门槛

首先，我们需要在全局Rule中设定一个准入制度：

```
【全局Rule - Skills准入流程】
用户提出需求时：
1. 检查是否存在匹配的Skill
2. 如果匹配，回复用户："我命中了【Skill名称】规则"
3. 询问用户是否需要先生成技术文档？
   - 是 → 先生成技术方案文档
   - 否 → 直接按照Skill开始工作
4. 如果未匹配，正常处理需求
```

### 例子：命中Skill的流程

**用户需求：**
> 我需要为用户表新增一个字段 `vipLevel`，表示用户的会员等级，需要存储到数据库

**大模型回复：**
> 我命中了【需求变更开发】Skill。
> 
> 该Skill要求进行回归测试，确保与现有代码兼容。
> 
> 建议我先为您生成：
> - 📋 技术变更方案（包含数据库迁移、代码改动清单）
> - 🧪 回归测试用例
> 
> 您是否需要先查看技术方案？还是直接开始编码？

---

## Skills的四大分类

### 1️⃣ 新需求开发

处理全新功能的开发需求。

**包含内容：**
- 技术文档阅读和理解
- 技术方案生成
- 代码生成规范

**代码规范示例：**

```
【Lombok规范】
✓ 类级注解：@Data @Builder @NoArgsConstructor @AllArgsConstructor
✗ 不要：混合使用@Getter @Setter

【Stream流规范】
✓ 链式调用，可读性优先
✓ 单行超过100字符时分行
✗ 不要：嵌套过深的stream

【统一CRUD接口（DDD风格）】
- 查询：List<UserDTO> queryByCondition(UserQueryCommand cmd)
- 创建：UserId create(UserCreateCommand cmd)
- 更新：void modify(UserId id, UserModifyCommand cmd)
- 删除：void remove(UserId id)
```

**实例代码：新增用户积分功能**

```java
// Command对象
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPointsOperateCommand {
    private UserId userId;
    private Integer points;
    private String operationType; // ADD / DEDUCT / SET
    private String reason;
}

// 服务层 - DDD风格
@Service
@RequiredArgsConstructor
public class UserPointsService {
    
    private final UserPointsRepository repository;
    
    // 查询用户积分
    public List<UserPointsDTO> queryByUserId(UserId userId) {
        return repository.findByUserId(userId)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    // 操作积分
    public void operate(UserPointsOperateCommand cmd) {
        UserPoints points = repository.findLatestByUserId(cmd.getUserId())
            .orElseThrow(() -> new BusinessException("用户不存在"));
        
        points.operate(cmd.getOperationType(), cmd.getPoints(), cmd.getReason());
        repository.save(points);
    }
}

// 聚合根
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPoints {
    private UserId userId;
    private Integer totalPoints;
    private LocalDateTime lastModifyTime;
    
    public void operate(String operationType, Integer points, String reason) {
        switch(operationType) {
            case "ADD" -> this.totalPoints += points;
            case "DEDUCT" -> this.totalPoints -= points;
            case "SET" -> this.totalPoints = points;
            default -> throw new IllegalArgumentException("不支持的操作类型");
        }
        this.lastModifyTime = LocalDateTime.now();
    }
}
```

---

### 2️⃣ 需求变更开发

处理需求的修改和升级。

**核心要求：**
- ✅ 必须做回归测试
- ✅ 必须考虑与旧代码的兼容性
- ✅ 必须进行影响范围分析

**实例代码：修改订单状态流程**

假设原来只有三个状态：待支付、已支付、已完成。现在要新增"待发货"状态。

```java
// ❌ 错误做法：直接修改枚举
public enum OrderStatus {
    PENDING_PAYMENT,      // 待支付
    PAID,                 // 已支付
    PENDING_SHIPMENT,     // ❌ 新增 - 直接加在中间
    COMPLETED
}

// ✅ 正确做法：向后兼容
public enum OrderStatus {
    PENDING_PAYMENT,      // 待支付 (code=1)
    PAID,                 // 已支付 (code=2)
    COMPLETED,            // 已完成 (code=3)
    PENDING_SHIPMENT,     // 待发货 (code=4) - 新增到末尾
}

// 回归测试：确保旧数据能正常工作
@Test
public void testBackwardCompatibility() {
    // 旧数据中的订单状态值不变
    Order order = new Order();
    order.setStatus(OrderStatus.PAID.getCode()); // 2
    
    // 新逻辑能否正确识别
    assertTrue(order.isPaid());
    assertFalse(order.isPendingShipment());
    
    // 状态流转是否兼容
    order.updateStatus(OrderStatus.PENDING_SHIPMENT);
    assertTrue(order.isPendingShipment());
}

// 数据库迁移脚本
@Test
public void testDataMigration() {
    // 扫描所有状态为 PAID 的订单
    // 自动更新为 PENDING_SHIPMENT（如果需要）
    List<Order> orders = repository.findByStatus(OrderStatus.PAID);
    orders.forEach(order -> {
        // 根据业务逻辑决定是否需要状态迁移
        if (order.shouldBeShipping()) {
            order.setStatus(OrderStatus.PENDING_SHIPMENT);
        }
    });
}
```

---

### 3️⃣ 通用规范

适用于所有开发场景的规范约束。

#### 📄 分页规范

```java
@Data
public class PageCommand {
    private Integer pageNo = 1;
    private Integer pageSize = 20;
    private String orderBy;
    private String sort; // ASC / DESC
}

@Data
public class PageResponse<T> {
    private List<T> data;
    private Integer pageNo;
    private Integer pageSize;
    private Long total;
    
    public static <T> PageResponse<T> of(List<T> data, Integer pageNo, Integer pageSize, Long total) {
        PageResponse<T> response = new PageResponse<>();
        response.setData(data);
        response.setPageNo(pageNo);
        response.setPageSize(pageSize);
        response.setTotal(total);
        return response;
    }
}
```

#### 🎯 统一返回格式

```java
@Data
public class ApiResponse<T> {
    private Integer code;        // 错误码
    private String message;      // 错误信息
    private T data;              // 业务数据
    private Long timestamp;      // 时间戳
    
    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setCode(0);
        response.setMessage("success");
        response.setData(data);
        response.setTimestamp(System.currentTimeMillis());
        return response;
    }
    
    public static <T> ApiResponse<T> fail(Integer code, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setCode(code);
        response.setMessage(message);
        response.setTimestamp(System.currentTimeMillis());
        return response;
    }
}
```

#### ⚠️ 异常处理规范

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ApiResponse<?> handleBusinessException(BusinessException e) {
        return ApiResponse.fail(e.getCode(), e.getMessage());
    }
    
    @ExceptionHandler(Exception.class)
    public ApiResponse<?> handleException(Exception e) {
        return ApiResponse.fail(-1, "系统异常");
    }
}

public class BusinessException extends RuntimeException {
    private Integer code;
    
    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }
}
```

#### 📝 日志规范

```java
@Slf4j
@Service
public class OrderService {
    
    public void processOrder(OrderId orderId) {
        log.info("开始处理订单, orderId={}", orderId);
        try {
            // 业务逻辑
            log.debug("订单校验完成, version={}", order.getVersion());
        } catch (Exception e) {
            log.error("订单处理失败, orderId={}, error={}", orderId, e.getMessage(), e);
            throw new BusinessException(-1, "订单处理失败");
        }
        log.info("订单处理完成, orderId={}", orderId);
    }
}
```

#### 📚 导入规范

```
✓ 按照顺序导入：
  1. java.*
  2. javax.*
  3. Spring相关
  4. 其他第三方
  5. 本项目类
  
✗ 避免：通配符导入 (import xxx.*)
```

---

### 4️⃣ 优化：记录和完善规则

这是一个**持续优化**的环节。

**场景1：发现Skill文档错误**

```
运行情况：按照【新需求开发】Skill执行时，代码编译失败
问题原因：Skill中的@Data注解配置不完整，没有考虑Lombok版本兼容性
修复方案：更新Skill文档，添加版本要求说明
记录信息：
  - 时间：2026-02-23
  - Skill：新需求开发
  - 问题：@Data注解在Lombok 1.18.30中behavior改变
  - 修复命令：更新pom.xml, 明确Lombok版本
  - 查看位置：可查阅此运行日志
```

**场景2：发现缺失的规范**

```
运行情况：完成【需求变更开发】后，代码review发现缺失单元测试规范
问题原因：Skill中没有明确单元测试的覆盖率要求
改进方案：新增【单元测试规范】到通用规范
包含内容：
  - 行覆盖率 ≥ 80%
  - Mockito使用规范
  - 测试用例命名规范
  - 边界值测试要求
记录信息：
  - 改进时间：2026-02-23
  - 修复者：大模型v1.0
  - PR地址：...
```

---

## 完整工作流示例

### 场景：需要为用户系统新增黑名单功能

**Step 1: 用户提出需求**
> 需要为用户系统新增黑名单功能，黑名单用户无法登录和下单

**Step 2: 大模型命中Skill并确认**
> 我命中了【新需求开发】Skill。
>
> 该Skill包括：
> - 📋 技术文档阅读
> - 🏗️ 技术方案生成  
> - 💻 代码生成（遵循Lombok、Stream、DDD规范）
>
> 是否先生成技术方案？

**Step 3: 生成技术方案**
```
【用户黑名单功能技术方案】

1. 数据模型
   - 新增 user_blacklist 表
   - 字段：id, user_id, reason, created_time, updated_time

2. 核心流程
   - 用户登录前校验黑名单
   - 下单前校验黑名单
   - 支持批量添加/移除黑名单

3. 服务接口设计
   - addToBlacklist(UserId, String reason)
   - removeFromBlacklist(UserId)
   - isBlacklisted(UserId): boolean
```

**Step 4: 按规范生成代码**

```java
// Command模式
@Data
@Builder
public class BlacklistOperateCommand {
    private UserId userId;
    private String reason;
    private LocalDateTime expireTime; // 可选的过期时间
}

// DDD风格的服务
@Service
@RequiredArgsConstructor
public class UserBlacklistService {
    
    private final UserBlacklistRepository repository;
    private final UserRepository userRepository;
    
    // 查询
    public List<UserBlacklistDTO> queryBlacklist(PageCommand pageCmd) {
        return repository.findAll(pageCmd)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    // 创建
    public void addToBlacklist(BlacklistOperateCommand cmd) {
        // 校验
        userRepository.findById(cmd.getUserId())
            .orElseThrow(() -> new BusinessException(400, "用户不存在"));
        
        // 检查是否已存在
        if (repository.exists(cmd.getUserId())) {
            throw new BusinessException(400, "用户已在黑名单中");
        }
        
        // 创建黑名单记录
        UserBlacklist blacklist = UserBlacklist.builder()
            .userId(cmd.getUserId())
            .reason(cmd.getReason())
            .expireTime(cmd.getExpireTime())
            .createdTime(LocalDateTime.now())
            .build();
            
        repository.save(blacklist);
        log.info("用户加入黑名单, userId={}, reason={}", cmd.getUserId(), cmd.getReason());
    }
    
    // 检查
    public boolean isBlacklisted(UserId userId) {
        UserBlacklist blacklist = repository.findByUserId(userId).orElse(null);
        
        if (blacklist == null) {
            return false;
        }
        
        // 检查过期时间
        if (blacklist.getExpireTime() != null && 
            blacklist.getExpireTime().isBefore(LocalDateTime.now())) {
            // 已过期，自动移除
            repository.delete(blacklist);
            return false;
        }
        
        return true;
    }
}

// 登录拦截
@Component
public class BlacklistLoginInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, 
                            Object handler) throws Exception {
        UserId userId = getUserIdFromRequest(request);
        
        if (userBlacklistService.isBlacklisted(userId)) {
            log.warn("黑名单用户登录尝试, userId={}", userId);
            throw new BusinessException(403, "您的账号已被禁用");
        }
        
        return true;
    }
}
```

**Step 5: 回归测试**

```java
@SpringBootTest
public class UserBlacklistServiceTest {
    
    @Test
    public void testAddToBlacklist() {
        // 新增黑名单
        BlacklistOperateCommand cmd = BlacklistOperateCommand.builder()
            .userId(UserId.of(123L))
            .reason("违规操作")
            .build();
        
        service.addToBlacklist(cmd);
        
        // 验证
        assertTrue(service.isBlacklisted(UserId.of(123L)));
    }
    
    @Test
    public void testBlacklistExpired() throws InterruptedException {
        // 添加即将过期的黑名单
        BlacklistOperateCommand cmd = BlacklistOperateCommand.builder()
            .userId(UserId.of(124L))
            .reason("临时限制")
            .expireTime(LocalDateTime.now().plusSeconds(1))
            .build();
        
        service.addToBlacklist(cmd);
        assertTrue(service.isBlacklisted(UserId.of(124L)));
        
        // 等待过期
        Thread.sleep(2000);
        assertFalse(service.isBlacklisted(UserId.of(124L)));
    }
    
    @Test
    public void testLoginWithBlacklistUser() {
        // 确保黑名单用户无法登录
        // 测试登录拦截器...
    }
}
```

---

## 总结

| 类型 | 适用场景 | 核心要求 |
|------|--------|---------|
| 新需求开发 | 全新功能 | 规范、文档、可复用 |
| 需求变更开发 | 修改功能 | 回归测试、兼容性、影响范围 |
| 通用规范 | 所有场景 | 分页、返回格式、异常、日志、导入 |
| 优化 | 持续改进 | 记录问题、完善文档、提升质量 |

通过这个Skills系统，我们能够：

✅ **约束大模型** - 避免发散思维  
✅ **统一规范** - 代码质量一致  
✅ **降低成本** - 减少review和修复时间  
✅ **持续优化** - 记录问题，不断完善  
