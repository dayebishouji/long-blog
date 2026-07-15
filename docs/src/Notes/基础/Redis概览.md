---
updateTime: '2025-12-21 18:26'
tags: 基础
---
默认最大连接1w
官方：单机下TPS是8w; qps10w
# 为什么快？
- IO多路复用
- 单线程+多线程
- 内存

# 数据类型
- String（字符串）
- Hash（哈希）
- List（列表）
- Set（集合）
- Zset（有序集合）
- BitMap（2.2 版新增）
- HyperLogLog（2.8 版新增）
- GEO（3.2 版新增）
- Stream（5.0 版新增）

## 常见数据类型及其特性
  
<table><thead><tr><th>结构类型</th><th>结构存储的值</th><th>读写能力</th></tr></thead><tbody><tr><td>String 字符串</td><td>可以是字符串、整数或浮点数</td><td>对字符串进行操作；对整数或者浮点数进行自增或自减操作</td></tr><tr><td>List 列表</td><td>一个链表，链表上每个节点包含一个字符串</td><td>对链表的两端进行 push 和 pop 操作，读取单个或多个元素；根据值查找或删除元素</td></tr><tr><td>Set 集合</td><td>包含字符串的无序集合</td><td>字符串的集合，包含基本的方法如判断是否存在、添加、获取、删除；还包含计算交集、并集、差集</td></tr><tr><td>Hash 散列</td><td>包含键值对的无序散列表</td><td>包含添加、获取、删除单个元素</td></tr><tr><td>Zset 有序集合</td><td>存储键值对，和散列一样</td><td>字符串成员与浮点数分数之间的有序映射；元素的排列顺序由分数的大小决定；包含方法如添加、获取、删除单个元素以及根据分值范围或成员来获取元素</td></tr></tbody></table>

## 新增数据类型及其特性

1. BitMap（2.2 版新增）： 二值状态统计的场景，比如签到、判断用户登录状态、连续签到用户总数等。
2. HyperLogLog（2.8 版新增）： 海量数据基数统计的场景，比如百万级网页 UV 计数等。
3. GEO（3.2 版新增）： 存储地理位置信息的场景，比如滴滴叫车。
4. Stream（5.0 版新增）： 消息队列，相比于基于 List 类型实现的消息队列，有两个特有的特性：自动生成全局唯一消息ID，支持以消费组形式消费数据。
## 数据类型的应用场景
- String 类型： 缓存对象、常规计数、分布式锁、共享 session 信息等。
- List 类型： 消息队列（但有两个问题：1. 生产者需要**自行实现全局唯一 ID**；2. 不能以消费组形式消费数据 3.**无持久化和ACK**）等。
- Hash 类型： 缓存对象、购物车等。
- Set 类型： 聚合计算（并集、交集、差集）场景，比如点赞、共同关注、抽奖活动等。
- Zset 类型： 排序场景，比如排行榜、电话和姓名排序等。
- BitMap 类型： 二值状态统计的场景，比如签到、判断用户登录状态、连续签到用户总数、海量用户去重等。
- HyperLogLog 类型： 海量数据基数统计的场景，比如百万级网页 UV 计数等。
- GEO 类型： 存储地理位置信息的场景，比如滴滴叫车。
- Stream 类型： 消息队列，相比于基于 List 类型实现的消息队列，有自动生成全局唯一消息ID，支持以消费组形式消费数据等特性。

# 数据结构
```c
typedef struct dictEntry{
  sds key;
  redisObject value;
}
typedef struct redisObject {
   unsigned type:4; // 对象类型
   unsigned encoding:4; // 编码方式
   unsigned lru:REDIS_LRU_BITS; // 最近访问时间
   int refcount; // 引用计数
   void *ptr; // 指向实际数据的指针
} robj;
```
### SDS
- len 保证二进制安全
- free 惰性释放空间
- buffer[]
- 编码类型
  - int 方便incr
  - embstr 44字节转成raw
  - raw 头部和字符串内容位于不同的
### zipList
- 记录前置节点的长度，用于双向遍历，但是会引发连锁更新问题
### ListPack 
- 不记录前置节点的长度，只记录当前几点长度
### quickList
- 512长度/64字节转换
### skipList

```c
typedef struct zskiplistNode {
//Zset 对象的元素值
 sds ele;
  //元素权重值
  double score;
    //后向指针
  struct zskiplistNode *backward;
  //节点的level数组，保存每层上的前向指针和跨度
  struct zskiplistLevel {
  struct zskiplistNode *forward;
      unsigned long span;//这个span用于记录下一条的长度（zrank非常快）
  } level[];
} zskiplistNode;
```
- 生成一个随机数<0.25，就增加层数，最多不超过32层
- 节点大于128/某个长度大于64字节的时候才会使用
- 简单、内存友好、不会页分裂、树平衡、平均1.33个指针
### 扩容的渐进式reHash
# 淘汰策略
- 默认不淘汰
- LRU
- LFU
  - 前**16位**代表最近访问时间
    - 可以实现随时间衰减
    - (now-recently)/lfu_decay_time  N分钟内**没有被访问就会衰减**N/lfu_decay_time
  - **后8位**代表访问次数
    - 根据lfu_log_factory因子计算得到一个概率决定是否增长
- 随机
- 最小ttl
  - 会有单独的hash表记录key的过期时间
# 过期删除策略
- 定期删除
  - slow
    - 10HZ
    - 扫描20个key,超过10%过期，继续扫描，最大16轮次
  - fast
    - 每次事件循环时候检查
- 惰性删除
# 持久化策略
## RDB
- 多少秒内多少个key改变 Fork一个子进程（写时复制）
## AOF
- 每秒持久化 every secons
- 每条命令持久化 always
- 由操作系统决定 NO
### AOF重写
## 混合
> 默认是RDB持久化
# 集群
## 主从
  - 全量同步
  - 增量同步
## 哨兵
  - 选主
  - 通知客户端switch
## 集群
  - gossip协议
    - meet、fail、ping、pong
  - 16384
# 缓存问题
- 一致性
- 大key
  - 分析RDB文件
  - scan扫描
  - bigkeys命令
- 热key
  - 探测
  - 数据倾斜
  - 同步到本地缓存
- 击穿
- 穿透
- 雪崩
# 优化方向
- 优化单线程
- 只存储索引
- 调整底层数据结构转换阈值
- 连接数
