---
updateTime: '2025-12-21 18:26'
tags: 面经
---
## jy
使用MQ的注意点

线上慢接口问题排查

BFS迷宫(最小的步数走到终点)

```java
Arrays.fill(step[][] ,-1)//代表没有走过
x={-1,1}
y={-1,1}
for(int i=0;i<2;i++){
  for(int j=0;j<2;j++){
  int next=nums[i][j];
  }
}
求2的平方根(二分)
double l=0,r=2;
while(r-l<1e-6){
  double mid=l+(r-l)/2;
  if(mid*mid<2){
    l=mid;
  }else{
    r=mid;
  }
}
```
# 二面
系统的技术指标、业务指标
难点：技术难点、业务难点
**技术指标：**
1. 每个系统 wms，oms，tms 的 sla 要达到 4 个 9
2. 每个系统的报错分 p0 p1 ，p0 包括核心履约链路，需要立即解决，1 个小时内没解决 at 上级，p1 放宽到 24 小时
3. 核心履约作业链路 rt 时间不能超过 1 秒，海外放宽到 3 秒（为什么是 1 和 3 秒，人的体感）
如果针对 ozon 订单对接来说，技术指标应该是同步准确率，订单最大延时率，同步异常率，所以会有定时校验来兜底。

**业务指标** 以对接 ozon 为例
1. 每天 500 单，如果业务方来回在 ozon 后台和 oms 操作履约发货，需要 0.5 人天，这个人效就是对接的 roi
2. 人工操作难免有错，错一单相当于亏两单的钱（因为错发一单还要重发一单），系统能保证准确性
3. 通过 oms 和 ozon 订单的对账保证两边订单数据一致，避免漏发、错发、迟发
**总结：人力成本ROI**

**核心链路**：订单，包裹，分拣，发货

sku的转换关系的缓存key拆分

TCC(存在中间状态，最终一致) 和 两阶段提交(强一致) 的区别 缺点：全局阻塞，单点故障，数据不一致风险

内存泄漏除了threadLocal还有啥  **文件流、数据库连接、网络socket**等资源（因为资源(句柄)属于操作系统管理，与方法生命周期无关），**静态集合**
**排查**：jmap -dump 内存快照用工具分析  VisualVM 或 JProfiler 

jmap -histo[:live] 打印每个class的实例数目,内存占用,类全名信息. VM的内部类名字开头会加上前缀”*”. 如果live子参数加上后,只统计活的对象数量. 

synchronized

数据库选型：mysql和redis的区别

字符串剔除(单调栈 如果栈顶小，剔除) 剔除n个数，让整个数字最大

关键：尽量剔除左边的较小的数字

注意：如果最后没删够数字，要从栈顶剔除

## 三面
分布式计算
raft协议：prdIndex如何拿到？

我的举例：维护一个全局原子变量 消费者去生产者拿消息前得到preIndex,拿消息后更新这个preIndex

给一个序列：123456789101112131415  第m个数是哪个？

步骤：确定区间，当前区间的第几个
```java
public class Main {
    public static void main(String[] args) {
        // Scanner input=new Scanner(System.in);
        // String str=input.next();
        // System.out.println("hello world");
        int m=16;
        int[] nums={1,2,3,4,5,6,7,8,9,0};
        int sum=Arrays.stream(nums).reduce(0, Integer::sum);
        //9 90*2 900*3 9000
        //1 10  100
        //10 11 12 13 14 15
        int t=0;
        int cur=0;
        int m_=m;
        // int sum=0;
        while(true){

            cur+= (int) ((t+1)* 9*Math.pow(10, t));
            if(m<=cur){
                break;
            }
            m_ -= (int) ((t+1)* 9*Math.pow(10, t++));
        }
        t++;
        System.out.println(t);
        System.out.println(m_);
        int count=(m_) / t;
        int mod=m_%t;
        int ans=0;
        if(mod!=0){
            ans= (int) (Math.pow(10, t-1)+count);
            String s=ans+"";
            ans=s.charAt(mod-1)-'0';
        }else{
            ans=(int) (Math.pow(10, t-1)+count-1)%10;
        }
        System.out.print(ans);
    }
}
```
