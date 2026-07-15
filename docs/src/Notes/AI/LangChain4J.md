---
updateTime: '2025-12-21 18:26'
tags: AI
---
官网教程[https://docs.langchain4j.dev/category/tutorials/](https://docs.langchain4j.dev/category/tutorials/)

<h1 id="7684980a">langchain4j工程结构</h1>

![](/minio/weblog/546028854aeb43b8a7322eaf04a4775c.png)


<h1 id="jGE3y">使用</h1>
依赖

```xml
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-open-ai</artifactId>
    <version>1.0.0-beta1</version>
</dependency>
<!-- high Level还要引入该依赖 -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j</artifactId>
    <version>1.0.0-beta1</version>
</dependency>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-bom</artifactId>
            <version>1.0.0-beta1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

简单使用

```java
OpenAiChatModel model = OpenAiChatModel.builder()
    .baseUrl("http://langchain4j.dev/demo/openai/v1")
    .apiKey("demo")
    .modelName("gpt-4o-mini")
    .build();
```



<h2 id="M4LN3">SpringBoot集成</h2>

**LangChain4j Spring Boot 集成需要 Java 17 和 Spring Boot 3.2。**

```xml
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-open-ai-spring-boot-starter</artifactId>
    <version>1.0.0-beta1</version>
</dependency>
<!-- 使用highLevel方式还要依赖 -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-spring-boot-starter</artifactId>
    <version>1.0.0-beta1</version>
</dependency>
```

```properties
langchain4j.open-ai.chat-model.api-key=${OPENAI_API_KEY}
# 流失输出
langchain4j.open-ai.streaming-chat-model.api-key=${OPENAI_API_KEY}
langchain4j.open-ai.chat-model.model-name=gpt-4o
langchain4j.open-ai.chat-model.log-requests=true
langchain4j.open-ai.chat-model.log-responses=true

```

> **ChatLanguageModel 对象就会被放到Spring容器**

```java
@AiService
interface Assistant {

    @SystemMessage("You are a polite assistant,now time is {{time}}")
    String chat(@UserMessage String userMessage,@V("time")String time);
}
```

> **直接注入就可以使用**
>
> **@Autowired  
Assistant assistant;**

<h3 id="hh4OE">流式响应</h3>

```java
interface Assistant {

    TokenStream chat(String message);
}

// 注意如果不是starter，注册的时候要指定streamingChatLanguageModel
TokenStream tokenStream = assistant.chat("Cancel my booking");

tokenStream
    .onToolExecuted((ToolExecution toolExecution) -> System.out.println(toolExecution))
    .onPartialResponse(...)
    .onCompleteResponse(...)
    .onError(...)
    .start();
```

<h1 id="6f0d599a">结构化输出</h1>

> 要求大模型只能输出指定格式的数据（json）
  注意只有部分模型支持: **OpenAI、Azure OpenAI、Google AI Gemini 和 Ollama 模型, 但是通义千问里面大多数模型都不支持**
  **它在流式处理模式下不起作用**

<h2 id="low-level-api">Low Level API</h2>

```java
final ChatLanguageModel chatLanguageModel;

@GetMapping("/json")
public String jsonFormat(@RequestParam(value = "message") String message){

    //ResponseFormat指定要大模型输出的格式
    ResponseFormat responseFormat = ResponseFormat.builder()
    .type(ResponseFormatType.JSON)//json格式
    .jsonSchema(JsonSchema.builder()
                .rootElement(JsonObjectSchema.builder()
                             .addIntegerProperty("age")
                             .addIntegerProperty("weight")
                             .build())
                .build())
    .build();

    // 构建请求对象ChatRequest指定响应格式
    ChatResponse chat = chatLanguageModel.chat(ChatRequest.builder()
                                               .messages(List.of(UserMessage.from(message)))
                                               .parameters(ChatRequestParameters.builder()
                                                           .responseFormat(responseFormat)
                                                           .build())
                                               .build());
    return chat.aiMessage().text();
}
```

<h2 id="hight-level-api">Hight Level API</h2>
声明一个需要返回的结构体

```java
@Data
public class Person {

    private Integer age;

    private Integer weight;
}

// 添加描述

// 如果 LLM 没有提供所需的输出，则可以对类和字段进行注释，
// 以便向 LLM 提供更多正确输出的说明和示例，例如：@Description

@Description("a person")
record Person(@Description("person's first and last name, for example: John Doe") String name,
              @Description("person's age, for example: 42") int age,
              @Description("person's height in meters, for example: 1.78") double height,
              @Description("is person married or not, for example: false") boolean married) {
}
```

创建一个接口服务

```java
public interface PersonService {

    Person extractPerson(String msg);
}
```

调用服务

```java
@GetMapping("/high/json")
public String highJson(@RequestParam(value = "message") String message) {
    PersonService personService = AiServices.create(PersonService.class, chatLanguageModel);
    return personService.extractPerson(message).toString();
}
```



<h1 id="o6yT4">图片输入</h1>

```java
package com.health.langchain.service;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiChatRequestParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Base64;

@Component
@RequiredArgsConstructor
public class ImageService {
    //    final StreamingChatLanguageModel streamingChatLanguageModel;
    final ChatLanguageModel myChatLanguageModel;

    public String recognitionImage(byte[] image, String text, String type) {
        String base64Data = Base64.getEncoder().encodeToString(image);


        ImageContent imageContent = ImageContent.from(base64Data, type);//"image/png"

        UserMessage userMessage = UserMessage.from(imageContent);


        UserMessage userMessage2 = UserMessage.from(text);

//UserMessage userMessage UserMessage.from(TextContent.from("你好"),imageContent)

        ChatRequest chatRequest = ChatRequest.builder()
                .parameters(OpenAiChatRequestParameters.builder()
                        // .tempreture(0d)
                        // modelName("qwen-omni-turbo")
                        .build())
                .messages(userMessage, userMessage2)
                .build();

        ChatResponse chatResponse = myChatLanguageModel.doChat(chatRequest);
        AiMessage aiMessage = chatResponse.aiMessage();
        System.out.println(aiMessage.text());

        return aiMessage.text();
    }
}

```

<h1 id="433739f4">Function Calling /结构化输入</h1>
通过AI大模型来调用我们的自定义函数

## Low level API

```java
ToolSpecification toolSpecification = ToolSpecification.builder()
.name("Calculator")
.description("输入两个输，对这两个数求和")
.parameters(JsonObjectSchema.builder()
            .addIntegerProperty("a", "第一个数")
            .addIntegerProperty("b", "第二个数")
            .required("a")
            .required("b")
            .build())
.build();
ChatResponse chatResponse = chatLanguageModel.doChat(ChatRequest.builder()
                                                     .messages(List.of(UserMessage.from(message)))
                                                     .parameters(ChatRequestParameters.builder()
                                                                 .toolSpecifications(toolSpecification)
                                                                 .build()).build());
```

<h2 id="high-level-api">High Level API</h2>
通过@Tool注解来声明函数

```java
@Tool("计算两个数字的差")
public int sub(@P("the first number") int a, @P("the second number") int b) {

    return a - b;

}

//如果工具函数的参数不是基本类型对象
@Description("Query to execute")
class Query {

    @Description("Fields to select")
    private List<String> select;

    @Description("Conditions to filter on")
    private List<Condition> where;
}

@Tool
Result executeQuery(Query query) {
...
}
```

在Assistant初始化时注册函数

```java
@Bean
public Assistant initAssistant(EmbeddingStore<TextSegment> embeddingStore) {
    return AiServices.builder(Assistant.class)
                              .chatLanguageModel(chatLanguageModel)
                              .chatMemory(chatMemory)
                              .contentRetriever(EmbeddingStoreContentRetriever.from(embeddingStore))
                              .tools(new HighLevelCalculator())
                              .build();
}
```

```plain
Request 1:
- messages:
    - UserMessage:
        - text: What is the square root of 475695037565?
- tools:
    - sum(double a, double b): Sums 2 given numbers
    - squareRoot(double x): Returns a square root of a given number

Response 1:
- AiMessage:
    - toolExecutionRequests:
        - squareRoot(475695037565)


... here we are executing the squareRoot method with the "475695037565" argument and getting "689706.486532" as a result ...


Request 2:
- messages:
    - UserMessage:
        - text: What is the square root of 475695037565?
    - AiMessage:
        - toolExecutionRequests:
            - squareRoot(475695037565)
    - ToolExecutionResultMessage:
        - text: 689706.486532

Response 2:
- AiMessage:
    - text: The square root of 475695037565 is 689706.486532.
```



<h1 id="f6adedba">模型上下文协议 （MCP）</h1>

约定请求方式，返回值的类型 

**该协议指定了两种类型的传输,这两种传输都受支持:**

+ **`HTTP`:客户端请求 SSE 通道以接收来自 server的工具url,然后通过 HTTP POST 请求发送命令。**
+ **`stdio`:客户端可以将 MCP 服务器作为本地子进程运行,并且通过标准输入/输出直接与它通信。**

**举例http**

```java
McpTransport transport = new HttpMcpTransport.Builder()
    .sseUrl("http://localhost:3001/sse")
    .logRequests(true) // if you want to see the traffic in the log
    .logResponses(true)
    .build();
```

**举例stdio**

```plain
import java.util.Scanner;

public class McpServer {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        while (scanner.hasNextLine()) {
            String line = scanner.nextLine().trim();
            if (line.equals("exit")) break;
            try {
                String[] parts = line.split(" ");
                int a = Integer.parseInt(parts[0]);
                String op = parts[1];
                int b = Integer.parseInt(parts[2]);
                switch (op) {
                    case "+": System.out.println(a + b); break;
                    case "-": System.out.println(a - b); break;
                    default: System.out.println("Unknown operator");
                }
            } catch (Exception e) {
                System.out.println("Invalid request");
            }
        }
        scanner.close();
    }
}

import java.io.*;

public class Client {
    public static void main(String[] args) throws IOException, InterruptedException {
        // 启动子进程(Runtime.exec())
        ProcessBuilder pb = new ProcessBuilder("java", "McpServer");
        pb.redirectErrorStream(true); // 合并错误流到标准输出
        Process process = pb.start();

        // 获取输入输出流
        try (
            //process.getOutputStream()：父进程向子进程的 stdin 写入数据。
            //process.getInputStream()：父进程从子进程的 stdout 读取数据。
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));
        ) {
            // 发送请求并读取响应（单线程顺序操作）
            String[] requests = {"3 + 5", "10 - 2", "invalid"};
            for (String req : requests) {
                System.out.println("[Client] Send: " + req);
                writer.write(req);
                writer.newLine(); // 发送换行符作为结束标记(后面按行读取)
                writer.flush(); // 确保数据立即发送

                // 读取响应
                String response = reader.readLine();
                System.out.println("[Server] Response: " + response);
            }

            // 发送退出命令
            writer.write("exit");
            writer.newLine();
            writer.flush();
        }

        // 等待子进程结束
        process.waitFor();
    }
}
```



<h2 id="developing-the-tool-provider">开发 Tool Provider</h2>

**让我们创建一个名为 Java 的类,它使用 LangChain4j 连接到我们的 GitHub MCP 服务器。此类将:**`McpGithubToolsExample`

+ **在 Docker 容器中启动 GitHub MCP 服务器(该命令位于 `docker` `/usr/local/bin/docker`)**
+ **使用 stdio 传输建立连接**
+ **使用 LLM 总结 LangChain4j GitHub 仓库的最后 3 次提交**

**注意**：在下面的代码中，我们将 GitHub 令牌传入环境变量 .但对于不需要身份验证的公有仓库上的某些作，这是可选的。`GITHUB_PERSONAL_ACCESS_TOKEN`

**这是实现：**

```java
public static void main(String[] args) throws Exception {

    ChatLanguageModel model = OpenAiChatModel.builder()
        .apiKey(System.getenv("OPENAI_API_KEY"))
        .modelName("gpt-4o-mini")
        .logRequests(true)
        .logResponses(true)
        .build();

    // 要先在本地启动mcp server
    //构建镜像： docker build -t mcp/github -f src/github/Dockerfile .

    //MCP 传输的实例 如何本地启动一个mcp server
    McpTransport transport = new StdioMcpTransport.Builder()
        .command(List.of("/usr/local/bin/docker", "run", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "-i", "mcp/github"))
        .logEvents(true) // only if you want to see the traffic in the log
        .build();

    //创建一个mcp客户端 from the transport
    McpClient mcpClient = new DefaultMcpClient.Builder()
        .transport(transport)
        // .logMessageHandler(new MyLogMessageHandler()) //怎么处理日志消息
        .build();

    // 从客户端创建 MCP 工具提供程序（从这里获得mcpServer返回的结果，并发给大模型）
    ToolProvider toolProvider = McpToolProvider.builder()
        .mcpClients(List.of(mcpClient))
        .build();

    //将工具提供程序绑定到 AI 服务
    Bot bot = AiServices.builder(Bot.class)
        .chatLanguageModel(model)
        .toolProvider(toolProvider)
        .build();

    try {
        String response = bot.chat("Summarize the last 3 commits of the LangChain4j GitHub repository");
        System.out.println("RESPONSE: " + response);
    } finally {
        mcpClient.close();
    }
}
```

**注意**：此示例使用 Docker，因此执行 中提供的 Docker 命令（根据您的作系统更改路径）。如果要使用 Podman 而不是 Docker，请相应地更改命令。`/usr/local/bin/docker`

<h1 id="38dbd336">会话记忆</h1>

Langchain4j内置了**两个chatMemory的实现**

1. MessageWindowChatMemory
2. TokenWindowChatMemory

<h2 id="aQyrR">Low Level API</h2>

基于MessageWindowChatMemory和low level api的实现示例

```java
private final static ChatMemory chatMem = MessageWindowChatMemory.withMaxMessages(20);

@GetMapping("/langchain/chat")
public RestResult<String> chatWithLangchain(
    @RequestParam(value = "message") String message) {
    chatMem.add(UserMessage.from(message));
    ChatResponse chat = chatLanguageModel.chat(chatMem.messages());
    chatMem.add(chat.aiMessage());
    return RestResult.buildSuccessResult(chat.aiMessage().text());
}
```

基于ChatMemoryStore重新实现会话记忆的存储

重新实现ChatMemoryStore接口，并组装到ChatMemory中即可

```java
public class PersistentChatMemoryStore implements ChatMemoryStore {
    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        //根据id从数据库获取消息记录
        return null;
    }

    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> list) {

        //根据id修改、新增数据到数据库
    }

    @Override
    public void deleteMessages(Object memoryId) {
        //根据id删除数据库记录
    }
}
```

<h2 id="n8uyY">High Level API</h2>
在Assistant对象初始化时配置

```java
final ChatLanguageModel chatLanguageModel;

@Bean
public Assistant initAssistant(EmbeddingStore<TextSegment> embeddingStore) {
    return AiServices.builder(Assistant.class)
                              .chatLanguageModel(chatLanguageModel)
                              .chatMemory(MessageWindowChatMemory.withMaxMessages(10))
                              .build();
}
```



<h1 id="bpIw8">会话隔离</h1>
通过memoryId进行会话隔离

```java
public interface ChatService{

    String chat(@MemoryId String memoryId, @UserMessage String message);
}
```

初始化ChatService时提供ChatMemoryProvider

```java
@Bean
public Assistant initChatService(EmbeddingStore<TextSegment> embeddingStore) {
    return AiServices.builder(Assistant.class)
                              .chatLanguageModel(chatLanguageModel)
                              //默认放到内存
                              .chatMemoryProvider(memoryId -> MessageWindowChatMemory.builder()
                                                  //Builder默认的chatMemoryStore为InMemoryChatMemoryStore，id为default
                                                  .maxMessages(10)
                                                  .id(memoryId)
                                                  //                        .chatMemoryStore(new PersistentChatMemoryStore())
                                                  .build())
                              .build();
}
```

通过Assistant调用会话服务

```java
private final ChatService chatService;

@GetMapping("/chatSepByUser")
public String chatSepByUser(
    @RequestParam(value = "memoryId") String memoryId,
    @RequestParam(value = "message") String message) {
    return chatService.chat(memoryId, chatService.chat(message));
}
```



<h1 id="Azi7Q">RAG</h1>

```java
// 注册EmbeddingStore，实际可以替换为你的任何store(redis,neo4j)
@Bean
public EmbeddingStore<TextSegment> initStore() {
    return new InMemoryEmbeddingStore<>();
}
   
@Bean
public Assistant embeddingAssistant(EmbeddingStore<TextSegment> embeddingStore, ChatLanguageModel chatLanguageModel) {
   return AiServices.builder(Assistant.class)
           .chatLanguageModel(chatLanguageModel)
           .contentRetriever(EmbeddingStoreContentRetriever.from(embeddingStore))
           .build();
}

// 注册文档到embeddingStore
List<Document> documents = FileSystemDocumentLoader.loadDocuments("D:\\lecture\\lecture-langchain\\documents");
EmbeddingStoreIngestor.ingest(documents, embeddingStore);
```

<h1 id="73af639a">联网搜索能力</h1>

首先需要注册https://www.searchapi.io 并申请到API key

**初始化查询引擎**

```java
@Bean
public SearchApiWebSearchEngine initSearchEngine() {
    return SearchApiWebSearchEngine.builder()
    .apiKey(
        searchConfig.getApiKey()
    )
    .engine(searchConfig.getEngine())
    .build();
}
```

**为对话服务配置查询引擎工具**

```java
@Bean
public Assistant initAssistant(EmbeddingStore<TextSegment> embeddingStore,
                               SearchApiWebSearchEngine searchApiWebSearchEngine) {
    return AiServices.builder(Assistant.class)
                              .chatLanguageModel(chatLanguageModel)
                              .tools(new WebSearchTool(searchApiWebSearchEngine))
                              .build();
}
```

<h1 id="caa99bdb">可定制的 HTTP 客户端</h1>

**有 2 种开箱即用的实现:**

+ **`JdkHttpClient` 在模块中。 当使用支持的模块(例如 )时,默认情况下会使用它。**
+ **`SpringRestClient` 当使用受支持模块的 Spring Boot starter时,默认情况下使用它。**

```java
HttpClient.Builder httpClientBuilder = HttpClient.newBuilder()
        .sslContext(...);

JdkHttpClientBuilder jdkHttpClientBuilder = JdkHttpClient.builder()
        .httpClientBuilder(httpClientBuilder);

RestClient.Builder restClientBuilder = RestClient.builder()
        .requestFactory(new HttpComponentsClientHttpRequestFactory());

SpringRestClientBuilder springRestClientBuilder = SpringRestClient.builder()
        .restClientBuilder(restClientBuilder)
        .streamingRequestExecutor(new VirtualThreadTaskExecutor());

OpenAiChatModel model = OpenAiChatModel.builder()
        .httpClientBuilder(jdkHttpClientBuilder)
        .apiKey(System.getenv("OPENAI_API_KEY"))
        .modelName("gpt-4o-mini")
        .build();
```

<h1 id="X2kNq">可观察性</h1>

```java
ChatModelListener listener = new ChatModelListener() {

    @Override
    public void onRequest(ChatModelRequestContext requestContext) {
        ChatRequest chatRequest = requestContext.chatRequest();

        List<ChatMessage> messages = chatRequest.messages();
        System.out.println(messages);

        ChatRequestParameters parameters = chatRequest.parameters();
        System.out.println(parameters.modelName());
        System.out.println(parameters.temperature());
        System.out.println(parameters.topP());
        System.out.println(parameters.topK());
        System.out.println(parameters.frequencyPenalty());
        System.out.println(parameters.presencePenalty());
        System.out.println(parameters.maxOutputTokens());
        System.out.println(parameters.stopSequences());
        System.out.println(parameters.toolSpecifications());
        System.out.println(parameters.toolChoice());
        System.out.println(parameters.responseFormat());

        if (parameters instanceof OpenAiChatRequestParameters openAiParameters) {
            System.out.println(openAiParameters.maxCompletionTokens());
            System.out.println(openAiParameters.logitBias());
            System.out.println(openAiParameters.parallelToolCalls());
            System.out.println(openAiParameters.seed());
            System.out.println(openAiParameters.user());
            System.out.println(openAiParameters.store());
            System.out.println(openAiParameters.metadata());
            System.out.println(openAiParameters.serviceTier());
            System.out.println(openAiParameters.reasoningEffort());
        }

        System.out.println(requestContext.modelProvider());

        Map<Object, Object> attributes = requestContext.attributes();
        attributes.put("my-attribute", "my-value");
    }

    @Override
    public void onResponse(ChatModelResponseContext responseContext) {
        ChatResponse chatResponse = responseContext.chatResponse();

        AiMessage aiMessage = chatResponse.aiMessage();
        System.out.println(aiMessage);

        ChatResponseMetadata metadata = chatResponse.metadata();
        System.out.println(metadata.id());
        System.out.println(metadata.modelName());
        System.out.println(metadata.finishReason());

        if (metadata instanceof OpenAiChatResponseMetadata openAiMetadata) {
            System.out.println(openAiMetadata.created());
            System.out.println(openAiMetadata.serviceTier());
            System.out.println(openAiMetadata.systemFingerprint());
        }

        TokenUsage tokenUsage = metadata.tokenUsage();
        System.out.println(tokenUsage.inputTokenCount());
        System.out.println(tokenUsage.outputTokenCount());
        System.out.println(tokenUsage.totalTokenCount());
        if (tokenUsage instanceof OpenAiTokenUsage openAiTokenUsage) {
            System.out.println(openAiTokenUsage.inputTokensDetails().cachedTokens());
            System.out.println(openAiTokenUsage.outputTokensDetails().reasoningTokens());
        }

        ChatRequest chatRequest = responseContext.chatRequest();
        System.out.println(chatRequest);

        System.out.println(responseContext.modelProvider());

        Map<Object, Object> attributes = responseContext.attributes();
        System.out.println(attributes.get("my-attribute"));
    }

    @Override
    public void onError(ChatModelErrorContext errorContext) {
        Throwable error = errorContext.error();
        error.printStackTrace();

        ChatRequest chatRequest = errorContext.chatRequest();
        System.out.println(chatRequest);

        System.out.println(errorContext.modelProvider());

        Map<Object, Object> attributes = errorContext.attributes();
        System.out.println(attributes.get("my-attribute"));
    }
};

//这里也采用了责任链模式
ChatLanguageModel model = OpenAiChatModel.builder()
        .apiKey(System.getenv("OPENAI_API_KEY"))
        .modelName(GPT_4_O_MINI)
        .listeners(List.of(listener))
        .build();

model.chat("Tell me a joke about Java");
```
