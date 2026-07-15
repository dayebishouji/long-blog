---
updateTime: '2025-12-21 18:26'
tags: 架构
---
# 难点描述
- 由于用户的连接对象 不可以序列化/反序列化
- 用户的会话(连接)**只能被存储在长连接集群中的一台机器上**
- 不同机器上的用户连接如何通讯？
- 不同机器上的通讯如何保障**消息可靠和有序**？
  - 因为消息会被发送到不同的服务，所以如果到强制保证有序，等收到ack再投递下一条。
- 如果用户当前不在线？如何保证消息可靠**存储**？
  - 由具体的消息服务来存储，设置ack字段，前端收到消息后需要返回ack,**超时重新投递**

# 方案一
- 广播
  > 所有节点都**监听同一频道**，判断如果当前用户不在当前机器，则丢弃该消息。
  > 问题：
  >
  > **每次都广播，浪费带宽**
# 方案二
- 广播+路由表
  >由于方案一需要每次都发送广播，所以可以**广播之后**，接受一条ack消息(包含当前用户所有的节点信息)，下次如果是**同一用户，直接查表**
  >
  >问题：如果用户所在节点挂了/用户重连，**连接打到了另一台机器**
  >
  >兜底：接受的机器如果没查到当前消息**返回NACK**，发送方接收到nack后，**再次广播**获取新的连接节点
# 方案三
- 全局注册/路由中心
  > 搭建**统一路由中心**，接受用户建立连接请求，由这个注册中心来决定路由到哪台机器
  >
  > 接受消息投递请求，由这个路由服务决定路由到哪个机器<br>
  > 注意：建议**先去请求 路由服务** 获取具体哪一个IM集群的地址后，**直连IMServer**，避免长连接跨多个服务。
  >
- 路由策略
  - hash
  - 一致性hash
  - range
  - 路由表
## 路由服务如何 跟 具体的IMServer集群通讯？
### dubbo
> Consumer -> Proxy -> Cluster（集群策略选择）  -> ClusterInvoker（执行集群调用逻辑） -> LoadBalance（选择一个invoker） -> Invoker （发起实际远程调用） -> Provider
> - Cluster
>     - **作用**：将多个服务提供者节点组织成一个 “虚拟节点”，并定义集群调用策略。<br>
>     - **原理**：根据配置的集群容错策略（如 Failover、Failfast、Forking 等）创建对应的 ClusterInvoker。
> - ClusterInvoker
>     - **作用**：实现具体的集群调用逻辑，包括：
>        - 调用负载均衡选择一个节点
>        - 失败重试、熔断、降级等
>     - **原理**：由 Cluster 创建，持有所有可用服务提供者的 Invoker 列表。
> - LoadBalance
>     - **作用**：在多个服务提供者中选择一个节点进行调用。
>     - **原理**：实现如随机（random）、轮询（roundrobin）、最少活跃（leastactive）等算法。
> - Invoker（服务调用器）
>     - **作用**：封装一次具体的远程调用细节（协议、地址、方法等）。
>     - **原理**：一个 Invoker 代表一个远程服务提供者节点的可用调用对象。
>  

#### 指定负载到哪一个节点
- 在LoadBalance
```java
public class RpcContextIpLoadBalance implements LoadBalance {
    @Override
    public <T> Invoker<T> select(List<Invoker<T>> invokers, URL url, Invocation invocation) {
         // 在调用前把目标 IP 放进 RpcContext：
         // RpcContext.getContext().setAttachment("targetIp", "192.168.1.100");

        // 从 RpcContext 取目标 IP
        String targetIp = RpcContext.getContext().getAttachment("targetIp");

        if (targetIp != null && !targetIp.isEmpty()) {
            for (Invoker<T> invoker : invokers) {
                if (targetIp.equals(invoker.getUrl().getHost())) {
                    return invoker; // 命中目标 IP，直接返回
                }
            }
        }

        // 没有指定 IP 或 IP 不存在，则走默认负载均衡（比如随机）
        int index = new Random().nextInt(invokers.size());
        return invokers.get(index);
    }
}
// 在消费者端指定使用这个 LoadBalance：
@Reference(loadbalance = "rpcContextIpLoadBalance")
private DemoService demoService;
```
> **注册**：
> 在 src/main/resources/META-INF/dubbo/org.apache.dubbo.rpc.cluster.LoadBalance下
```
rpcContextIpLoadBalance=com.zjy.loadbalance.RpcContextIpLoadBalance

```
- 在ClusterInvoker
```java
public class ImRouterClusterInvoker<T> extends AbstractClusterInvoker<T> {

    public ImRouterClusterInvoker(Directory<T> directory) {
        super(directory);
    }

    @Override
    protected Result doInvoke(Invocation invocation, List list, LoadBalance loadbalance) throws RpcException {
        checkWhetherDestroyed();
        String ip = (String) RpcContext.getContext().get("ip");
        if (StringUtils.isEmpty(ip)) {
            throw new RuntimeException("ip can not be null!");
        }
        //获取到指定的rpc服务提供者的所有地址信息
        List<Invoker<T>> invokers = list(invocation);
        Invoker<T> matchInvoker = invokers.stream().filter(invoker -> {
            //拿到我们服务提供者的暴露地址（ip:端口的格式）
            String serverIp = invoker.getUrl().getHost() + ":" + invoker.getUrl().getPort();
            return serverIp.equals(ip);
        }).findFirst().orElse(null);
        if (matchInvoker == null) {
            throw new RuntimeException("ip is invalid");
        }
        return matchInvoker.invoke(invocation);
    }
}

public class ImRouterCluster implements Cluster {

    @Override
    public <T> Invoker<T> join(Directory<T> directory, boolean buildFilterChain) throws RpcException {
        return new ImRouterClusterInvoker<>(directory);
    }
}
```
> **注册**：
> src/main/resources/META-INF/dubbo/internal/org.apache.dubbo.rpc.cluster.Cluster
```
imRouter=org.qiyu.live.im.router.provider.cluster.ImRouterCluster
```
- Dubbo3.x 调用前指定
```java
UserSpecifiedAddressUtil.setAddress(new Address("192.168.1.100", 20880, true));
ImService.router("message");
```

### OpenFeign
动态构建特定URL的Feign客户端
```java
public <T> T createFeignClient(Class<T> targetClass, String url){
  Feign.Builder builder=Feign.builder()
  .encoder(new JacksonEncoder())
  .decoder(new JacksonDecoder)
  .contract(new SpringMvcContract());
  return builder.target(targetClass,url);
}
  
```
