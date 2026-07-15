---
updateTime: '2026-03-07 23:25'
tags: work
---
# 一文搞懂Trace链路追踪
在单体应用时代，排查问题很简单——只要拿到异常堆栈，顺着代码调用链路一步步debug，就能快速定位问题。但随着系统架构向分布式、微服务演进，一个用户请求可能会经过网关、接口服务、业务服务、数据库、缓存等多个节点，涉及成百上千个线程和服务实例，此时传统的排查方式彻底失效。

比如：用户反馈“下单失败”，日志中只看到某个服务抛了异常，但不知道这个请求是从哪个网关进来的、经过了哪些服务、在哪个节点耗时最长、为什么会走到异常分支——这时候，**Trace链路追踪**就成了分布式系统排查问题的“万能导航”，它能把一个请求的全链路调用过程串联起来，让我们清晰看到每一步的执行情况。


## 一、如何把一整个链路串联起来呢？
trace_id 贯穿请求流转的所有服务与中间件，为分散在各个节点的日志、监控数据提供统一的关联依据
实现思路
在服务最开始的入口生成traceID，然后把traceID放到当前线程上下文中(threadLocal)
![](/minio/weblog/image_trace_id.png)


## 二、核心概念
所有主流链路追踪框架（SkyWalking、Zipkin、Jaeger）的底层核心概念完全一致

### 1. Trace：一条完整的请求链路（全局唯一标识）
**定义**：从用户发起请求（如点击下单）到系统返回响应的**全生命周期**，无论经过多少服务、多少节点，整个过程的所有操作都属于同一条Trace，由**Trace ID**（全局唯一）标识。
**通俗比喻**：把Trace比作“一张快递单”，Trace ID就是“快递单号”，从商家发货→快递揽收→中转运输→派件→签收，整个快递流转过程，都对应同一个快递单号。
**核心特征**：全局唯一（通常为UUID/雪花算法生成），贯穿请求全链路，所有节点的操作都关联同一个Trace ID。

### 2. Span：链路中的一个独立操作（最小执行单元）
**定义**：Trace链路中的**最小执行单元**，代表一个独立的操作，如“网关接收请求”“服务A调用服务B”“查询数据库”“更新缓存”等，每个Span由**Span ID**（当前链路内唯一）标识。
**通俗比喻**：把Span比作“快递流转的每一个节点”，如“快递揽收”“北京中转”“上海派件”，每个节点都是一个独立的Span，有自己的节点编号（Span ID）。
**每个Span必存数据**（所有框架通用）：
- 基础标识：Trace ID（关联所属链路）、Span ID（自身唯一）、Parent Span ID（父Span标识，建立父子关系）；
- 时间信息：开始时间、结束时间、执行耗时（结束-开始）；
- 业务信息：操作名称（如`/order/create`、`select * from user`）、请求参数、响应结果、异常堆栈（失败时）；
- 元数据：服务IP、线程ID、部署节点等。

### 3. 上下文传递：链路串联的核心（分布式的关键）
**定义**：分布式系统中，服务之间相互独立（不同进程/不同服务器），**通过特定方式将Trace ID、Parent Span ID等核心信息，从调用方传递到被调用方**，让不同服务的Span能关联到同一条Trace，最终串联成完整链路。
**通俗比喻**：快递员在中转快递时，会把“快递单号（Trace ID）”“上一个节点编号（Parent Span ID）”写在快递单上，下一个节点接收后，就能知道这个快递属于哪个单号、来自哪个节点。
**主流传递方式**（开发中最常见）：
- HTTP调用：通过**请求头**传递（如`trace-id: xxx`、`parent-span-id: xxx`）；
- RPC调用（Dubbo/GRPC）：通过**RPC元数据/附件**传递；
- 消息队列（RocketMQ/Kafka）：通过**消息头/消息属性**传递。


## 三、手动实现简易链路追踪

### Python版示例：Django框架下实现Trace ID传递与日志关联
配置请求过滤器
```python
def create_log_id_if_not_exists(request) -> str:
    """Ensure a trace_id exists in bytedlogger.thread_storage and return it."""
    _logid = ""

    # 请求头有'x-tt-logid'
    _logid = request.META.get("x-tt-logid", "")
    if _logid:
        return _logid

    # Try read existing value from thread storage
    try:
        if bytedlogger is not None:
            v = bytedlogger.thread_storage.get(b"_logid")
            if v:
                _logid = six.ensure_text(v)
                return _logid
    except Exception:
        pass

    # Generate a new trace id
    try:
        if logid is not None:
            _logid = logid.generate_v2()
    except Exception:
        _logid = ""

    return _logid
  
class TraceMiddleware(MiddlewareMixin):
    """
    Lightweight middleware to ensure each request has a trace_id early.
    Initializes minimal context to make trace_id available to logging filters.
    """

    def __init__(self, get_response):
        MiddlewareMixin.__init__(self, get_response)
        logging.getLogger(__name__).info("TraceMiddleware initialized")

    def __call__(self, request):

        _logid = create_log_id_if_not_exists(request)

        # Save back to thread storage
        try:
            if bytedlogger is not None and _logid:
                # 这里可以替换为你的上下文（threading.local()/contextvars.ContextVar(name, default=None)）
                bytedlogger.thread_storage[b"_logid"] = _logid.encode("utf-8")
        except Exception:
            pass

        response = self.get_response(request)
        return response
 ```
 ```python
 # Djingo配置过滤器
 MIDDLEWARE = [
 
    'SreAssistant.common_utils.request_trace.TraceMiddleware',  # 只有 HTTP 请求 才会被 TraceMiddleware 处理

]
```
日志过滤器
```python
# 加上这个filer的hanlder,日志都会经过这个filter
class TraceIdLoggingFilter(logging.Filter):
    def filter(self, record):
        if not record or hasattr(record, "_logid"):
            return True
        logid = getattr(record, "tags", {}).get("_logid")
        if logid:
            record._logid = logid
            return True
        if bytedlogger is None:
            return True
        logid = bytedlogger.thread_storage.get(b"_logid", "-")
        record._logid = six.ensure_text(logid)
        return True
```
给logging绑定配置
```python
import logging
logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False, #如果之前有配置，合并
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)s %(_logid)s %(message)s"
                }
            },
            "filters": {
                "logid_filter": {
                    "()": TraceIdLoggingFilter,
                }
            },
            "handlers": {
                "log_agent": {
                    "level": "INFO",
                    "class": "bytedlogger.StreamLogHandler", # 这个类决定把日志输出到哪里
                    "version": 1,
                    "tags": {},
                    "filters": ["logid_filter"],
                    "background": use_background,
                }
                "console": {
                    "level": "INFO",
                    "class": "logging.StreamHandler", # 输出到控制台
                    "formatter": "default",
                    "filters": ["logid_filter"],
                },
                "app": {
                    "level": "DEBUG",
                    "class": "logging.handlers.RotatingFileHandler", # 现成的输出到文件的类
                    "filename": os.path.join(LOGS_DIR, "data.sre.assistant.app.log"),
                    "maxBytes": 1024 * 1024 * 10,  # 10MB
                    "backupCount": 10,
                    "formatter": "default",
                    "encoding": "utf8",
                },
            },
            
            "root": {# 等同于在loggers配置"":
                "handlers": ["log_agent", "console"], "level": "INFO"
            },
            "loggers": {
                "SreAssistant": { #父logger(子包也会使用这个logger)
                "handlers": [],
                "propagate": True,  # 显示配置传播，不处理，避免重复输出
                "level": "INFO",
                },
                "": {
                    "handlers": ["debug_console", "console", "app"],
                    "propagate": True,
                    "level": "INFO",
                },
            },
        }
)
class StreamLogHandler(logging.Handler):
    """
    适配 Python 标准库 logging 的 LogHandler，可以将日志写入流式日志平台。

    :param level: 参考 logging.Handler.__init__
    :param tags: 发送到流式日志系统的标签
    :type tags: dict
    :param end: 每条日志默认结束符
    :type end: str
    """

    def __init__(
        self,
        level=logging.NOTSET,
        tags=None,
        end="\n",
        timeout=0.2,
        socket_send_buf=None,
        background=False,
        client_queue_size=20,
        version=1):
        
        super(StreamLogHandler, self).__init__(level)

        if tags is None:
            tags = {}
        self.tags = tags

        self._task_name = bytedenv.get_psm()
        self._cluster = bytedenv.get_cluster()
        self._psm = bytedenv.get_psm()
        self._pod_name = bytedenv.get_pod_name()
        self._stage = bytedenv.get_stage()
        self._host = bytedenv.get_local_ip()
        self._idc = bytedenv.get_idc_name()
        self._language = "%s%d.%d" % (platform.python_implementation(), sys.version_info[0], sys.version_info[1])
        self._deploy_stage = bytedenv.get_stage()
        self._end = end
        self._version = version
        # 发送客户端(把record日志发到可视化平台)
        self._log_agent_client = ttlogagent.BackgroundClient(
            lock=self.lock,
            socket_connect_timeout=timeout,
            socket_timeout=timeout,
            socket_send_buf=socket_send_buf,
            queue_size=client_queue_size
        )

    def _get_default_tags(self, record):
        """
        记录每一条日志时发送的 tag，重载此方法可以自定义业务需要的 tags。

        :param record: logging record
        :type record: logging.LogRecord
        :rtype: dict
        """
        return {
            b"_level": ensure_bytes(record.levelname),
            b"_ts": ensure_bytes(int(record.created * 1000)),
            b"_host": ensure_bytes(self._host),
            b"_language": ensure_bytes(self._language),
            b"_taskName": ensure_bytes(self._psm),
            b"_psm": ensure_bytes(self._psm),
            b"_cluster": ensure_bytes(self._cluster),
            b"_deployStage": ensure_bytes(self._deploy_stage),
            b"_podName": ensure_bytes(self._pod_name),
            b"_process": ensure_bytes("%s(%d)" % (record.processName, record.process)),
            b"_location": ensure_bytes("%s:%d" % (record.pathname, record.lineno)),
            b"_logid": ensure_bytes(getattr(record, "_logid", b"-")),
        }

    def emit(self, record):
        """
        logging 库会自动调用，使用者不需要手动调用此方法。

        :param record: logging record
        :type record: logging.LogRecord
        """
        try:
            self.acquire()

            self._log_agent_client.emit(*self._get_client_args(record))
            if record.levelno >= 20:
                mcli.emit_counter(
                    self._psm + ".throughput",
                    1,
                    tags={"level": record.levelname, "cluster": self._cluster, "deploy_stage":bytedenv.get_stage()}
                )
        except (KeyboardInterrupt, SystemExit):
            raise
        except Exception:
            self.handleError(record)
        finally:
            self.release()

    def _get_client_args(self, record):
        tags = self._get_default_tags(record)

        # Inject thread's local storage, replace default tags
        _tags = dict(getattr(record, "tags", {}))
        msg = b''
        if not sec_mark_enabled():
            for k, v in get_persist_items():
                tags[ensure_bytes(k)] = ensure_bytes(v)
            if self.tags:
                for k, v in self.tags.items():
                    tags[ensure_bytes(k)] = ensure_bytes(v)
            for k, v in _tags.items():
                tags[ensure_bytes(k)] = ensure_bytes(v)
        else:
            frame = getattr(record, "stack", None)
            if frame:
                tags[ensure_bytes("stack")] = ensure_bytes(''.join(list(traceback.format_stack(f=frame))))
                delattr(record, "stack")

            for k, v in get_persist_items():
                msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + ensure_bytes(v) + ensure_bytes("}} ")

            if self.tags:
                for k, v in self.tags.items():
                    msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + \
                        ensure_bytes(v) + ensure_bytes("}} ")

            for k, v in _tags.items():
                msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + ensure_bytes(v) + ensure_bytes("}} ")

            tags[ensure_bytes("current_version")] = ensure_bytes(get_current_version())

        msg += ensure_bytes(self.format(record))
        return msg, tags

    def _get_client_v3_args(self, record):
        default_tags = self._get_default_tags(record)
        log_id = default_tags.get(b"_logid", ensure_bytes("-"))
        trans_id = int(default_tags.get(b"_trans_id", 0))
        span_id = int(default_tags.get(b"_span_id", 0))
        level = ensure_bytes(record.levelname)
        location = ensure_bytes("{}:{}".format(record.pathname, record.lineno))

        tags = dict()
        _tags = dict(getattr(record, "tags", {}))
        msg = b''
        if not sec_mark_enabled():
            tags = self.tags.copy()
            # Inject thread's local storage, replace default tags
            for k, v in get_persist_items():
                tags[k] = v
            tags.update(_tags)
            tags = {
                ensure_bytes(k): ensure_bytes(v) for k, v in tags.items()
            }
        else:
            frame = getattr(record, "stack", None)
            if frame:
                tags["stack"] = ''.join(traceback.format_stack(f=frame))
                delattr(record, "stack")

            for k, v in self.tags:
                msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + ensure_bytes(v) + ensure_bytes("}} ")

            for k, v in get_persist_items():
                msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + ensure_bytes(v) + ensure_bytes("}} ")

            for k, v in _tags.items():
                msg += ensure_bytes("{{") + ensure_bytes(k) + ensure_bytes("=") + ensure_bytes(v) + ensure_bytes("}} ")

            tags[ensure_bytes("current_version")] = ensure_bytes(get_current_version())

        msg += ensure_bytes(self.format(record))
        return msg, tags, level, location, log_id, trans_id, span_id

    def close(self):
        self._log_agent_client.commit()
        super(StreamLogHandler, self).close()
```


### java 版本
#### 环境准备
1. 搭建两个SpringBoot项目：order-service（端口8081）、stock-service（端口8082）；
2. 核心依赖（仅需web，无需其他）：
```xml
<!-- 两个服务都需要引入 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>5.8.20</version> <!-- 工具类，简化UUID生成、HTTP调用 -->
</dependency>
```

#### 核心步骤1：定义链路上下文工具类，存储Trace ID和Span ID
链路上下文需要在**当前线程**中传递，使用`ThreadLocal`实现，这是所有链路追踪框架的基础（如SkyWalking的`TraceContext`、Zipkin的`SpanContext`）。

创建公共工具类`TraceContextUtil`（两个服务都需要复制）：
```java
import cn.hutool.core.util.IdUtil;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 链路上下文工具类：ThreadLocal存储当前线程的Trace ID、Span ID、Parent Span ID
 */
public class TraceContextUtil {
    // ThreadLocal存储上下文，key：标识名，value：值
    private static final ThreadLocal<Map<String, String>> TRACE_CONTEXT = new ThreadLocal<>();
    // 上下文标识常量（统一定义，避免硬编码）
    public static final String TRACE_ID = "trace-id";
    public static final String SPAN_ID = "span-id";
    public static final String PARENT_SPAN_ID = "parent-span-id";

    /**
     * 初始化链路上下文（链路起点调用，如网关、第一个服务）
     */
    public static void init() {
        Map<String, String> context = new ConcurrentHashMap<>();
        context.put(TRACE_ID, IdUtil.fastUUID()); // 生成全局唯一Trace ID（UUID）
        context.put(SPAN_ID, generateSpanId());   // 生成当前Span ID
        context.put(PARENT_SPAN_ID, "0");         // 根Span的父ID为0
        TRACE_CONTEXT.set(context);
    }

    /**
     * 从外部（如请求头）加载上下文（被调用方调用）
     */
    public static void load(Map<String, String> context) {
        TRACE_CONTEXT.set(context);
    }

    /**
     * 获取上下文值
     */
    public static String get(String key) {
        Map<String, String> context = TRACE_CONTEXT.get();
        return context == null ? null : context.get(key);
    }

    /**
     * 设置上下文值（如创建子Span时更新Span ID和Parent Span ID）
     */
    public static void set(String key, String value) {
        Map<String, String> context = TRACE_CONTEXT.get();
        if (context != null) {
            context.put(key, value);
        }
    }

    /**
     * 生成Span ID（简易实现：UUID后6位，保证当前链路内唯一即可）
     */
    public static String generateSpanId() {
        return IdUtil.fastUUID().substring(26);
    }

    /**
     * 清理上下文（避免ThreadLocal内存泄漏，请求结束时调用）
     */
    public static void clear() {
        TRACE_CONTEXT.remove();
    }

    /**
     * 获取完整上下文（用于传递给下一个服务）
     */
    public static Map<String, String> getContext() {
        return TRACE_CONTEXT.get();
    }
}
```

#### 核心步骤2：定义拦截器，自动处理请求的上下文（入口/出口）
为了避免在每个接口中手动初始化/加载上下文，使用**SpringMVC拦截器**，在请求到达时处理上下文，请求结束时清理上下文，这是“无侵入式”的基础。

##### 订单服务（order-service，链路中间节点）拦截器`TraceInterceptor`
```java
import org.springframework.web.servlet.HandlerInterceptor;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

/**
 * 订单服务链路拦截器：处理请求上下文，创建Span
 */
public class TraceInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 从请求头中获取Trace ID、Parent Span ID
        String traceId = request.getHeader(TraceContextUtil.TRACE_ID);
        String parentSpanId = request.getHeader(TraceContextUtil.PARENT_SPAN_ID);

        // 2. 初始化/加载上下文（若没有Trace ID，说明是链路起点，手动初始化）
        Map<String, String> context = new HashMap<>();
        if (traceId == null || parentSpanId == null) {
            TraceContextUtil.init(); // 链路起点，初始化上下文
        } else {
            context.put(TraceContextUtil.TRACE_ID, traceId);
            context.put(TraceContextUtil.PARENT_SPAN_ID, parentSpanId);
            context.put(TraceContextUtil.SPAN_ID, TraceContextUtil.generateSpanId()); // 生成当前Span ID
            TraceContextUtil.load(context); // 加载上下文
        }

        // 3. 打印Span开始日志（模拟Span数据采集）
        String currentSpanId = TraceContextUtil.get(TraceContextUtil.SPAN_ID);
        System.out.printf("【订单服务-Span开始】TraceID：%s，SpanID：%s，父SpanID：%s，接口：%s%n",
                TraceContextUtil.get(TraceContextUtil.TRACE_ID),
                currentSpanId,
                TraceContextUtil.get(TraceContextUtil.PARENT_SPAN_ID),
                request.getRequestURI());

        // 4. 响应头回写Trace ID，方便前端/网关获取
        response.setHeader(TraceContextUtil.TRACE_ID, TraceContextUtil.get(TraceContextUtil.TRACE_ID));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 1. 打印Span结束日志（模拟Span耗时采集，简易实现：直接打印结束标识，实际需记录时间）
        System.out.printf("【订单服务-Span结束】TraceID：%s，SpanID：%s，接口：%s，异常：%s%n",
                TraceContextUtil.get(TraceContextUtil.TRACE_ID),
                TraceContextUtil.get(TraceContextUtil.SPAN_ID),
                request.getRequestURI(),
                ex == null ? "无" : ex.getMessage());

        // 2. 清理上下文，避免ThreadLocal内存泄漏
        TraceContextUtil.clear();
    }
}
```

##### 库存服务（stock-service，链路末端节点）拦截器`TraceInterceptor`
与订单服务基本一致，仅需修改日志中的“服务名称”，此处省略重复代码，核心逻辑完全相同。

##### 注册拦截器（两个服务都需要）
创建配置类`WebConfig`，将拦截器注册到Spring容器：
```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    // 注册拦截器
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(traceInterceptor()).addPathPatterns("/**"); // 拦截所有请求
    }

    @Bean
    public TraceInterceptor traceInterceptor() {
        return new TraceInterceptor();
    }
}
```

#### 核心步骤3：实现服务间调用，手动传递上下文（核心）
订单服务需要调用库存服务的扣减库存接口，此处使用Hutool的`HttpUtil`实现HTTP调用，**手动将Trace上下文通过请求头传递给库存服务**，这是链路串联的关键。

##### 1. 库存服务（stock-service）核心接口：扣减库存
```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StockController {
    /**
     * 扣减库存接口
     * @param productId 商品ID
     * @param num 扣减数量
     * @return 扣减结果
     */
    @GetMapping("/stock/deduct")
    public String deduct(@RequestParam String productId, @RequestParam Integer num) {
        // 模拟库存扣减逻辑
        System.out.printf("【库存服务-业务逻辑】TraceID：%s，商品ID：%s，扣减数量：%s%n",
                TraceContextUtil.get(TraceContextUtil.TRACE_ID),
                productId,
                num);
        return "库存扣减成功：商品ID=" + productId + "，扣减数量=" + num;
    }
}
```

##### 2. 订单服务（order-service）核心接口：创建订单（调用库存服务）
```java
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class OrderController {
    /**
     * 创建订单接口（链路核心：调用库存服务，传递Trace上下文）
     * @param productId 商品ID
     * @param num 购买数量
     * @return 下单结果
     */
    @GetMapping("/order/create")
    public String createOrder(@RequestParam String productId, @RequestParam Integer num) {
        // 1. 模拟订单创建前置逻辑
        System.out.printf("【订单服务-业务逻辑】TraceID：%s，创建订单：商品ID=%s，购买数量=%s%n",
                TraceContextUtil.get(TraceContextUtil.TRACE_ID),
                productId,
                num);

        // 2. 调用库存服务扣减库存：核心——将Trace上下文通过请求头传递
        String stockUrl = "http://localhost:8082/stock/deduct?productId=" + productId + "&num=" + num;
        // 获取当前链路上下文
        Map<String, String> traceContext = TraceContextUtil.getContext();
        // 发起HTTP请求，请求头中添加Trace上下文
        try (HttpResponse response = HttpRequest.get(stockUrl)
                .header(TraceContextUtil.TRACE_ID, traceContext.get(TraceContextUtil.TRACE_ID))
                .header(TraceContextUtil.PARENT_SPAN_ID, traceContext.get(TraceContextUtil.SPAN_ID))
                .execute()) {
            String stockResult = response.body();
            System.out.printf("【订单服务-调用库存】TraceID：%s，库存服务返回：%s%n",
                    TraceContextUtil.get(TraceContextUtil.TRACE_ID),
                    stockResult);
        }

        // 3. 模拟订单创建后置逻辑（如插入数据库、更新缓存）
        System.out.printf("【订单服务-业务逻辑】TraceID：%s，订单创建成功%n",
                TraceContextUtil.get(TraceContextUtil.TRACE_ID));

        return "下单成功：TraceID=" + TraceContextUtil.get(TraceContextUtil.TRACE_ID) + "，商品ID=" + productId;
    }
}
```

#### 核心步骤4：测试运行，查看手动实现的链路效果
1. 启动stock-service（8082）和order-service（8081）；
2. 访问订单服务创建订单接口：`http://localhost:8081/order/create?productId=1001&num=2`；
3. 查看两个服务的控制台日志，**所有日志都关联同一个Trace ID，Span ID和父Span ID正确传递**。

##### 订单服务（order-service）日志输出
```
【订单服务-Span开始】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，SpanID：a1b2c3，父SpanID：0，接口：/order/create
【订单服务-业务逻辑】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，创建订单：商品ID=1001，购买数量=2
【订单服务-调用库存】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，库存服务返回：库存扣减成功：商品ID=1001，扣减数量=2
【订单服务-业务逻辑】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，订单创建成功
【订单服务-Span结束】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，SpanID：a1b2c3，接口：/order/create，异常：无
```

##### 库存服务（stock-service）日志输出
```
【库存服务-Span开始】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，SpanID：d4e5f6，父SpanID：a1b2c3，接口：/stock/deduct
【库存服务-业务逻辑】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，商品ID：1001，扣减数量：2
【库存服务-Span结束】TraceID：3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f，SpanID：d4e5f6，接口：/stock/deduct，异常：无
```

#### 手动实现效果总结
✅ 所有操作关联**同一个Trace ID**，实现了全链路标识；
✅ 库存服务的**父Span ID** = 订单服务的**Span ID**，实现了Span的父子关联；
✅ 无需手动在每个接口写上下文代码，通过**拦截器**实现无侵入式处理；
✅ 能清晰看到请求的全链路执行过程，排查问题时只需根据Trace ID筛选日志。



### 为什么选SkyWalking？
- 🔥 **无侵入**：基于Java Agent实现，无需修改一行业务代码，只需添加JVM启动参数；
- 🔥 **功能全**：链路追踪+性能监控+服务依赖分析+告警+日志关联，一站式解决可观测性问题；
- 🔥 **适配广**：支持SpringCloud、Dubbo、GRPC等所有主流框架，支持Java/Go/Python等多语言；
- 🔥 **性能优**：对系统性能影响极小（CPU占用<5%，内存占用低），支持高并发场景。
#### 环境准备
1. 已有SpringCloud微服务项目（含网关Gateway、订单服务、库存服务等）；
2. 下载SkyWalking：[官方下载地址](https://skywalking.apache.org/downloads/)（推荐**8.16.0**稳定版，包含OAP服务器+UI）；
3. 下载Elasticsearch（SkyWalking依赖存储，推荐7.17.0版本）。

#### 步骤1：部署SkyWalking（单机版，生产需集群）
##### 1. 启动Elasticsearch
解压Elasticsearch，进入`bin`目录，直接启动：
- Linux/Mac：`./elasticsearch`
- Windows：`elasticsearch.bat`
验证启动成功：访问`http://localhost:9200`，返回JSON数据即成功。

##### 2. 配置SkyWalking，关联Elasticsearch
解压SkyWalking，进入`config`目录，修改`application.yml`，找到`storage`节点，配置为Elasticsearch：
```yaml
storage:
  selector: ${SW_STORAGE:elasticsearch} # 选择elasticsearch作为存储
  elasticsearch:
    nodes: ${SW_STORAGE_ES_NODES:localhost:9200} # ES地址，单机直接填localhost:9200
    username: ${SW_ES_USERNAME:""} # 无密码留空
    password: ${SW_ES_PASSWORD:""} # 无密码留空
```

##### 3. 启动SkyWalking OAP服务器和UI
进入SkyWalking的`bin`目录，依次启动：
###### （1）启动OAP服务器（核心：接收Span数据、聚合、存储）
- Linux/Mac：`./oapService.sh`
- Windows：`oapService.bat`

###### （2）启动UI（可视化界面，查看链路、依赖、性能）
- Linux/Mac：`./webappService.sh`
- Windows：`webappService.bat`

##### 4. 验证SkyWalking启动成功
访问UI地址：`http://localhost:8080`（默认端口8080，可在`webapp/application.yml`修改），看到如下界面即启动成功：

![SkyWalking UI首页](https://img-blog.csdnimg.cn/20240520173000789.png)
*（图3：SkyWalking UI首页，初始无数据，集成服务后会自动展示）*

#### 步骤2：SpringCloud服务集成SkyWalking（无侵入，仅需2步）
SkyWalking采用**Java Agent**技术，无需修改项目代码、无需引入依赖，仅需复制Agent包+添加JVM启动参数，所有SpringCloud服务（网关、订单、库存）都按此步骤操作。

##### 1. 复制SkyWalking Agent包到项目目录
从SkyWalking解压目录中，复制`agent`文件夹，放到每个微服务项目的根目录（如order-service/agent、gateway/agent），结构如下：
```
order-service/
├── agent/          # SkyWalking Agent包（直接复制）
│   ├── config/     # Agent配置文件
│   └── skywalking-agent.jar # 核心Agent包
├── src/
└── pom.xml
```

##### 2. 修改Agent配置，指定服务名和OAP地址
进入`agent/config`目录，修改`agent.config`，仅需配置2个核心参数（其余默认即可）：
```properties
# 1. 当前服务的名称（必须唯一，UI中根据服务名区分不同服务）
agent.service_name=${SW_AGENT_NAME:order-service} # 订单服务填order-service，网关填gateway，库存服务填stock-service
# 2. OAP服务器的地址（默认localhost:11800，若OAP部署在其他机器，修改为对应IP）
collector.backend_service=${SW_AGENT_COLLECTOR_BACKEND_SERVICES:localhost:11800}
```

##### 3. 添加JVM启动参数，指定Agent包
这是集成的核心步骤，在每个微服务的**启动配置**中，添加JVM参数`-javaagent`，指定`skywalking-agent.jar`的绝对路径。

###### IDEA中配置启动参数（推荐）
打开Run/Debug Configurations，在`VM options`中添加：
```bash
# 替换为你自己的agent包绝对路径（注意：路径中不要有空格）
-javaagent:D:\project\order-service\agent\skywalking-agent.jar
```


###### 生产环境Jar包启动配置
```bash
# 启动时添加-javaagent参数，放在-jar前面
java -javaagent:/opt/project/order-service/agent/skywalking-agent.jar -jar order-service-1.0.0.jar
```



## 四、生产环境最佳实践
集成和使用链路追踪时，很多人会遇到**链路断裂、数据缺失、性能影响**等问题，结合生产经验，总结10个最佳实践，避坑+优化一次讲透。

### 一、核心避坑指南
#### 坑1：链路断裂（部分Span缺失，无法串联）
**原因**：1. 自定义HTTP/RPC调用，未传递SkyWalking上下文；2. Agent配置的OAP地址错误，数据无法上报；3. 服务未集成Agent。
**解决方案**：1. 尽量使用框架自带的调用方式（Feign、Dubbo），自定义调用需手动传递请求头（SkyWalking默认传递头：`SW8`）；2. 检查Agent配置的`collector.backend_service`是否正确；3. 确保所有涉及的服务都集成了Agent。

#### 坑2：链路数据缺失（UI中看不到请求）
**原因**：1. 采样率配置过低（如高并发场景设置为10%，部分请求未采集）；2. Elasticsearch磁盘满，无法存储数据；3. OAP服务器挂掉。
**解决方案**：1. 调整采样率（`agent.config`中`agent.sample_rate=1000‰`为100%采样，高并发可适当降低）；2. 清理Elasticsearch磁盘，配置自动清理策略；3. 生产环境部署OAP集群，配置监控告警。

#### 坑3：异常堆栈缺失（显示异常但无堆栈）
**原因**：业务代码中**手动捕获异常但未重新抛出**，导致Agent无法采集异常堆栈。
**解决方案**：捕获异常后，若需要链路追踪展示，必须重新抛出（如`catch (Exception e) { log.error("异常", e); throw e; }`），或通过SkyWalking API手动上报异常。

#### 坑4：耗时统计不准确
**原因**：1. Agent版本与框架版本不兼容（如SkyWalking 8.0不支持SpringCloud 2021）；2. 服务之间网络延迟过大。
**解决方案**：1. 参考SkyWalking官方[兼容性文档](https://skywalking.apache.org/docs/main/latest/en/setup/service-agent/java-agent/supported-frameworks/)，选择兼容的Agent版本；2. 网络延迟为正常现象，重点关注**相对耗时**（占比），不纠结绝对耗时。

#### 坑5：日志与链路无法关联
**原因**：日志中未打印Trace ID，无法通过Trace ID筛选日志。
**解决方案**：在日志配置文件（如logback.xml）中，添加Trace ID打印，SkyWalking提供了日志集成插件，直接配置即可：
```xml
<!-- logback.xml中添加，日志中自动打印Trace ID -->
<encoder>
    <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [%X{traceId}] %-5level %logger{50} - %msg%n</pattern>
</encoder>
```
配置后，日志会自动打印Trace ID，如`[3f2a7d8e6b9c4a0b8f7e6d5c4b3a2e1f] 订单创建成功`，实现**链路追踪+日志**的无缝关联。

> 注意避坑：如果要查看trace链路的耗时情况，注意skywalkiing应该默认不追踪jdk本身的方法(因为所有都插桩的话，也会有性能损耗)，但是如果你的耗时操作刚好放在了异步线程里，然后最后join等待它，这个join的耗时就不会被记录到
