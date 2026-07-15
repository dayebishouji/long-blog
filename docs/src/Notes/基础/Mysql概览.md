---
updateTime: '2025-12-21 18:26'
tags: 基础
---
**OLTP事务型数据库**
![](/minio/weblog/0960a04948e34873bee6b1c3f4655ae1.png)
## 索引
- **字段类型**
  - 普通索引
  - 唯一索引
  - 主键索引
  - 全文索引
- **数据结构**

![](/minio/weblog/dced0c922b54417287892d99d2977db0.png)

  - B+Tree
  - Hash(ADI)
- **物理存储**
  - 聚簇
  - 非聚簇（二级）
## 日志
  - **redo**(crash safe)
    - 物理日志（哪个页多少偏移量 把什么改成了什么）
    - 保证持久性
  - **binglog**
    - 主从同步
  - **undo**
    - 回滚指针、事务id、修改之前的内容
    - 回滚段->Undo段->undo页->磁盘文件
    - 一个undo段是一组Undo页的链表，用于存储一个事务的undo记录
    - 保证原子性
   
## 锁
  - **全局锁**(数据备份的时候用到)
  - **表级锁**
    - 意向锁
    - 自增锁
      - 传统模式(锁表)
      - 连续锁定模式（连续插入锁表）
      - 交叉锁定模式（无表锁，satement模式同步会有问题）
    - 表锁
  - **行级锁**
    - 间隙锁
    - nextKeyLock
    - 行记录锁
    - 插入意向锁
   
## 存储引擎
  - **innodb**
    - 对于任务页面的修改都要记录redo(数据页、索引页、undo页)
  - MyISAM
## 内存结构
![](/minio/weblog/f387cbe6543f4e1ca870b658b3ad39a4.png)

  - **bufferPool**
    - 链表
      - LRU
      - free
      - flush
    - 自适应哈希
  - **changeBuffer**
    - 对于非唯一约束的改
  - **doubleWriteBuffer**
    - linux数据页是4KB,innodb是16KB,如果中途磁盘损坏，无法修复
## 优化
### 机器
  - **调小swappiness**,让系统几乎没内存的情况再发生内存交换，保证热点数据留在内存
### mysql服务
  - 调整bufferpool大小
  - 调整数据库连接数(默认151)
  - 搭建集群，分摊读压力
### mysql库表设计
  - 分库分表、读写分离、冷热分离
  - 表结构设计
    - 反范式(减少连表查询)
### SQL语句
  - 索引
  - limit分页
    - **游标**
    - 如果使用mybatis的插件分页，**关掉count**(自己并发去count(去掉order by))
  - 联表
    - 小表驱动大表
      - 在Nest Loop Join中循环读取 小表 去查找 大表 如果大表有索引 n*lg(M)
      - 如果大表没有索引，把小表的数据放Hash里,全量扫大表去匹配 O(M)*O(1)
    - 如果不需要join表的字段，**用exists代替**(匹配到值就停止匹配)
    - 把复杂的SQL拆分成多条简单sql,先返回id，**再并发地去查**，在内存做join，也避免优化器选择查询计划混乱，尽快释放连接
    - 可以先对数据做排序再去匹配，利用MRR(多范围读取)把随机IO改为顺序IO
### 缓存
  - **一级缓存**
  -  **二级缓存**
  -  注意缓存**一致性**、缓存**淘汰**、**热点**探测、穿透、击穿、雪崩等问题
### 更换数据库
  - 使用分布式数据库
  - 使用基于lucene的es等高性能搜索引擎
  - 需要注意更换后，带来的**数据迁移**问题
### explain分析
  - type
    - system
    - const
    - eq_ref
    - ref
    - index
    - all
  - extra
    - Using Index 仅使用索引（不回表）
    - Using Index Condition 索引下推
    - Using Where 还需在server层过滤
    - Using filer sort 需要进行文件排序（内存不够）
### 查看执行过程
  - 开启优化追踪**set optimizer_trace='enabled=on'**
  - 执行SQL会在Information_schema.optimizer_trace生成trace记录，查看他具体使用哪个索引，要扫描多少条计划，成本多少，怎么改造优化sql的
  - 具体关注：
    - preparation （SQL准备阶段（*改成具体的列））
    - optimization （SQL优化阶段(确定执行计划)）
    - execution（SQL执行阶段（和存储引擎流式交互））
