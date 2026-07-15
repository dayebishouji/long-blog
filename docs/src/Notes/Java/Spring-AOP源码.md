---
updateTime: '2025-12-21 18:26'
tags: Java
---
## 动态代理
 - jdk(必须有接口)
```java
UserService target = new UserService();

// UserInterface接口的代理对象
Object proxy = Proxy.newProxyInstance(UserService.class.getClassLoader(), new Class[]{UserInterface.class}, new InvocationHandler() {
	@Override
	public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
		System.out.println("before...");
		Object result = method.invoke(target, args);
		System.out.println("after...");
		return result;
	}
});

UserInterface userService = (UserInterface) proxy;
userService.test();
```
 - cglib(运行时通过ASM生成一个新的字节码(子类)，打破双亲委派)
 > **AspectJ**是在**编译时**对字节码进行了修改，是直接在UserService类对应的字节码中进行增强的，也就是可以理解为是在编译时就会去解析@Before这些注解，然后得到代理逻辑，加入到被代理的类中的字节码中去的，所以如果想用AspectJ技术来生成代理对象 ，是需要用单独的AspectJ编译器的。

这里主要介绍cglib动态代理
```java
UserService target = new UserService();

// 通过cglib技术
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(UserService.class);

// 定义额外逻辑，也就是代理逻辑
enhancer.setCallbacks(new Callback[]{new MethodInterceptor() {
	@Override
	public Object intercept(Object o, Method method, Object[] objects, MethodProxy methodProxy) throws Throwable {
		System.out.println("before...");
		Object result = methodProxy.invoke(target, objects);
		System.out.println("after...");
		return result;
	}
}});

// 动态代理所创建出来的UserService对象
UserService userService = (UserService) enhancer.create();

// 执行这个userService的test方法时，就会额外会执行一些其他逻辑
userService.test();
```
## spring如何使用代理？
### ProxyFactory
在Spring中进行了封装，封装出来的类叫做ProxyFactory，表示是创建代理对象的一个工厂
```java
UserService target = new UserService();

ProxyFactory proxyFactory = new ProxyFactory();
proxyFactory.setTarget(target);
proxyFactory.addAdvice(new MethodInterceptor() {//所有方法都被增强
	@Override
	public Object invoke(MethodInvocation invocation) throws Throwable {
		System.out.println("before...");
		Object result = invocation.proceed();
		System.out.println("after...");
		return result;
	}
});

UserInterface userService = (UserInterface) proxyFactory.getProxy();
userService.test();
```
通过ProxyFactory，可以不再关心到底是用cglib还是jdk动态代理了，ProxyFactory会去判断，如果UserService实现了接口，那么ProxyFactory底层就会用jdk动态代理，如果没有实现接口，就会用cglib技术
```java
// config就是ProxyFactory对象

// optimize为true,或proxyTargetClass为true,或用户没有给ProxyFactory对象添加interface
if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
	Class<?> targetClass = config.getTargetClass();
	if (targetClass == null) {
		throw new AopConfigException("TargetSource cannot determine target class: " +
				"Either an interface or a target is required for proxy creation.");
	}
    // targetClass是接口，直接使用Jdk动态代理
	if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
		return new JdkDynamicAopProxy(config);
	}
    // 使用Cglib
	return new ObjenesisCglibAopProxy(config);
}
else {
    // 使用Jdk动态代理
	return new JdkDynamicAopProxy(config);
}
```

### Advice的分类
1. Before Advice：方法之前执行
2. After returning advice：方法return后执行
3. After throwing advice：方法抛异常后执行
4. After (finally) advice：方法执行完finally之后执行，这是最后的，比return更后
5. Around advice：这是功能最强大的Advice，可以自定义执行顺序

### Advisor的理解
跟Advice类似的还有一个**Advisor**的概念，一个Advisor是由一个**Pointcut和一个Advice组成**的，通过Pointcut可以指定需要被代理的逻辑，比如一个UserService类中有两个方法，按上面的例子，这两个方法都会被代理，被增强，那么我们现在可以通过Advisor，来控制到具体代理哪一个方法
```java
		UserService target = new UserService();

		ProxyFactory proxyFactory = new ProxyFactory();
		proxyFactory.setTarget(target);
		proxyFactory.addAdvisor(new PointcutAdvisor() {
			@Override
			public Pointcut getPointcut() {//切点
				return new StaticMethodMatcherPointcut() {
					@Override
					public boolean matches(Method method, Class<?> targetClass) {
						return method.getName().equals("testAbc");
					}
				};
			}

			@Override
			public Advice getAdvice() {//增强逻辑
				return new MethodInterceptor() {
					@Override
					public Object invoke(MethodInvocation invocation) throws Throwable {
						System.out.println("before...");
						Object result = invocation.proceed();
						System.out.println("after...");
						return result;
					}
				};
			}

			@Override
			public boolean isPerInstance() {
				return false;
			}
		});

		UserInterface userService = (UserInterface) proxyFactory.getProxy();
		userService.test();
```
### 直接创建成Bean
Spring中所提供了ProxyFactory、Advisor、Advice、PointCut等技术来实现代理对象的创建，但是我们在使用Spring时，我们并不会直接这么去使用ProxyFactory，比如说，我们**希望ProxyFactory所产生的代理对象能直接就是Bean**，能直接从Spring容器中得到UserSerivce的代理对象
```java
@Bean
public ProxyFactoryBean userServiceProxy(){
	UserService userService = new UserService();

	ProxyFactoryBean proxyFactoryBean = new ProxyFactoryBean();
	proxyFactoryBean.setTarget(userService);
	proxyFactoryBean.addAdvice(new MethodInterceptor() {
		@Override
		public Object invoke(MethodInvocation invocation) throws Throwable {
			System.out.println("before...");
			Object result = invocation.proceed();
			System.out.println("after...");
			return result;
		}
	});
	return proxyFactoryBean;
}

```
## 如何批量创建代理？
### DefaultAdvisorAutoProxyCreator
```java
@Bean
public DefaultPointcutAdvisor defaultPointcutAdvisor(){
	NameMatchMethodPointcut pointcut = new NameMatchMethodPointcut();
	pointcut.addMethodName("test");//拦截谁

    DefaultPointcutAdvisor defaultPointcutAdvisor = new DefaultPointcutAdvisor();
	defaultPointcutAdvisor.setPointcut(pointcut);
	defaultPointcutAdvisor.setAdvice(new MyAfterReturningAdvice());//拦截后执行什么？

    return defaultPointcutAdvisor;
}

@Bean
public DefaultAdvisorAutoProxyCreator defaultAdvisorAutoProxyCreator() {
	
    DefaultAdvisorAutoProxyCreator defaultAdvisorAutoProxyCreator = new DefaultAdvisorAutoProxyCreator();

	return defaultAdvisorAutoProxyCreator;
}
```
### AbstractAdvisorAutoProxyCreator
![](/minio/weblog/9a7e215f4ef044d186a5f7c7251df907.png)

只要Spring容器中存在这个类型的Bean，就相当于开启了AOP，AbstractAdvisorAutoProxyCreator实际上就是一个**BeanPostProcessor**，所以在创建某个Bean时，就会进入到它对应的生命周期方法中，比如：在某个Bean初始化之后，会调用wrapIfNecessary()方法进行AOP，底层逻辑是，AbstractAdvisorAutoProxyCreator会找到**所有的Advisor**，然后判断当前这个Bean是否存在某个Advisor与之匹配（**根据Pointcut**），如果匹配就表示当前这个Bean有对应的切面逻辑，需要进行AOP，需要产生一个代理对象。
