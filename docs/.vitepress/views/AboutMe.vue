<template>
  <div class="mt-2 px-6 pb-24 md:px-12 md:pb-32 lg:px-16">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-center">
      <!-- 头像与徽章 -->
      <div class="relative mx-auto w-full">
        <!-- 头像 -->
        <div class="relative h-52 py-2">
          <div
            class="avatar-ping absolute left-1/2 top-1/2 mx-auto h-48 w-48 rounded-full shadow-[0px_0px_3px#147eae] dark:shadow-[0px_0px_3px#9ba0a9]"
          ></div>
          <img class="mx-auto block h-48 w-48 rounded-full" src="./img/avatar.jpg" alt="avatar" />
        </div>
        <!-- Right-tags -->
        <p
          style="top: 32%"
          class="tag-bounce absolute hidden rounded-full px-3 py-0.5 text-sm font-bold shadow-[0px_0px_1px_1px#eee] sm:left-[69%] sm:block md:left-[66%] lg:left-[63%] xl:left-[60%]"
        >
          🎵 二进制吟游诗人
        </p>
        <!-- <p
          style="top: 50%"
          class="tag-bounce absolute hidden rounded-full px-3 py-0.5 text-sm font-bold shadow-[0px_0px_1px_1px#eee] sm:left-[69%] sm:block md:left-[66%] lg:left-[63%] xl:left-[60%]"
        >
          绿茵场最佳气氛组
        </p> -->
        <!-- Left-tags -->
        <p
          style="top: 32%"
          class="tag-bounce absolute hidden rounded-full px-3 py-0.5 text-sm font-bold shadow-[0px_0px_1px_1px#eee] sm:left-[8%] sm:block md:left-[13%] lg:left-[21%] xl:left-[27%]"
        >
          🌙 倒头就睡懒羊羊
        </p>
        <p
          style="top: 50%"
          class="tag-bounce absolute hidden rounded-full px-3 py-0.5 text-sm font-bold shadow-[0px_0px_1px_1px#eee] sm:left-[8%] sm:block md:left-[13%] lg:left-[21%] xl:left-[27%]"
        >
          宇宙无敌暴龙战士🚀
        </p>
      </div>
      <!-- 概述与箴言 -->
      <div class="mt-4 flex w-full flex-col">
        <div class="flex flex-col justify-between gap-5 md:flex-row md:gap-0">
          <!-- 概述 -->
          <div
            class="flex w-full flex-col justify-center rounded-xl border bg-gradient-to-r from-sky-400 to-teal-400 px-8 py-4 text-white dark:border-slate-900 dark:from-sky-700 dark:to-teal-600 md:w-[59%]"
          >
            <p class="text-lg text-slate-50">你好，很高兴认识你 👋</p>
            <h1 class="text-2xl font-bold lg:break-normal lg:break-words xl:text-3xl">
              A Backend Developer From China
            </h1>
            <p class="text-slate-100">后端开发 🔥</p>
          </div>
          <!-- 箴言 -->
          <div
            class="bg-stripe w-full rounded-xl border bg-slate-50 p-4 dark:border-slate-900 dark:bg-slate-800 md:w-[39%]"
          >
            <p class="text-[12px]">箴言</p>
            <div>
              <h1 class="text-3xl leading-9">
                <span class="hidden font-bold text-teal-400 md:inline-block">Miracle&nbsp; </span>
                <span class="hidden lg:inline-block"> Is Everywhere</span>
              </h1>
              <h1 class="font-serif text-3xl tracking-widest md:text-2xl lg:text-3xl">
                纵有<span class="font-bold text-sky-500">狂风</span>拔地起
              </h1>
              <h1 class="text-2xl leading-9 md:text-3xl">
                <span class="inline-block font-bold text-teal-400 md:hidden">Miracle&nbsp; </span>
                <span class="inline-block lg:hidden">Is Everywhere</span>
              </h1>
            </div>
          </div>
        </div>
      </div>
      <!-- 简介与技术栈 -->
      <div class="mt-4 flex w-full flex-col justify-between gap-5 md:flex-row md:gap-0">
        <!-- 简介 -->
        <div
          class="bg-stripe w-full rounded-xl border bg-slate-50 p-4 dark:border-slate-900 dark:bg-slate-800 md:w-[35%]"
        >
          <p class="text-[12px]">简介</p>
          <div class="mt-2">
            <h1 class="text-xl">主修后端</h1>
            <h1 class="text-xl">辅修<span class="text-pink-500">人工智能</span></h1>
            <h1 class="text-xl md:text-base lg:text-xl">梦想是做程序员烧烤领袖</h1>
            <p></p>
          </div>
        </div>
        <!-- 技术栈 -->
        <div
          class="w-full rounded-xl border bg-slate-50 p-4 dark:border-slate-900 dark:bg-slate-800 md:w-[62%]"
        >
          <p class="text-[12px]">技术栈</p>
          <div class="mt-2 overflow-hidden">
            <!-- TODO:封装ICON组件,抽离背景颜色与svg地址 -->
            <div class="icon-scroll flex w-fit gap-4">
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-green-100 p-4">
                <img src="./img/mysql.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-sky-100 p-4">
                <img src="./img/redis.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-red-100 p-4">
                <img src="./img/rocketMq.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-cyan-100 p-4">
                <img src="./img/spring.webp" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-yellow-300 p-4">
                <img class="rounded-lg" src="./img/xxl-job.jpg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-sky-100 p-4">
                <img class="rounded-lg" src="./img/nacos.webp" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-teal-100 p-4">
                <img src="./img/kafka.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-purple-100 p-4">
                <img class="rounded-lg" src="./img/Java.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-sky-400 p-4">
                <img class="rounded-lg" src="./img/langchain4j.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-yellow-200 p-4">
                <img class="rounded-lg" src="./img/skywalking.svg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-gray-100 p-4">
                <img class="rounded-lg" src="./img/prometheus.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-green-100 p-4">
                <img class="rounded-lg" src="./img/mybatis.png" alt="" />
              </div>

              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-red-400 p-4">
                <img class="rounded-lg" src="./img/git.svg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-slate-100 p-4">
                <img class="rounded-lg" src="./img/python.svg" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-green-100 p-4">
                <img src="./img/mysql.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-sky-100 p-4">
                <img src="./img/redis.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-red-100 p-4">
                <img src="./img/rocketMq.png" alt="" />
              </div>
              <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-cyan-100 p-4">
                <img src="./img/spring.webp" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-yellow-300 p-4">
                <img class="rounded-lg" src="./img/xxl-job.jpg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-sky-100 p-4">
                <img class="rounded-lg" src="./img/nacos.webp" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-teal-100 p-4">
                <img src="./img/kafka.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-purple-100 p-4">
                <img class="rounded-lg" src="./img/Java.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-sky-400 p-4">
                <img class="rounded-lg" src="./img/langchain4j.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-yellow-200 p-4">
                <img class="rounded-lg" src="./img/skywalking.svg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-gray-100 p-4">
                <img class="rounded-lg" src="./img/prometheus.png" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-green-100 p-4">
                <img class="rounded-lg" src="./img/mybatis.png" alt="" />
              </div>

              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-red-400 p-4">
                <img class="rounded-lg" src="./img/git.svg" alt="" />
              </div>
              <div class="flex h-20 w-20 flex-shrink-0 justify-center rounded-lg bg-slate-100 p-4">
                <img class="rounded-lg" src="./img/python.svg" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 图片与荣誉 -->
      <div class="mt-4 flex w-full flex-col justify-between gap-5 md:flex-row md:gap-0">
        <!-- 图片 -->
        <div
          class="honer-bg h-52 w-full rounded-xl bg-cover bg-center bg-no-repeat sm:h-auto md:w-[45%]"
        ></div>
        <!-- 工作经历 -->
        <div
          class="bg-stripe w-full rounded-xl border bg-slate-50 p-4 dark:border-slate-900 dark:bg-slate-800 md:w-[50%]"
        >
          <p class="text-[12px]">工作经历</p>
          <h1 class="mt-2 text-4xl font-bold">龙行天下</h1>
          <div class="mt-4 md:text-base lg:text-xl">
            <p class="py-1">🐉 专注于后端技术，热爱开源与分享</p>
            <p class="py-1">🔥 关注高并发、分布式系统与 AI 工程化</p>
            <p class="py-1">🌟 持续学习中，记录成长的点滴</p>
          </div>
        </div>
      </div>
      <!-- 音乐/游戏 -->
      <div class="mt-4 flex w-full flex-col justify-between gap-5 md:flex-row md:gap-0">
        <!-- 音乐 -->
        <div
          class="relative h-52 min-h-[13rem] w-full overflow-hidden rounded-xl sm:h-auto md:h-auto md:w-[39%]"
        >
          <div class="music-bg absolute h-full w-full bg-cover bg-center bg-no-repeat"></div>
          <div class="relative z-10 p-4">
            <p class="text-[12px] text-slate-200">音乐喜好</p>
            <h1 class="mt-1.5 text-4xl font-bold text-white">流行、嘻哈</h1>
            <h1 class="mt-1.5 text-4xl font-bold text-white">欧美流行、</h1>
            <h1 class="mt-1.5 text-4xl font-bold text-white">轻音乐</h1>
            <p class="text-right text-sm text-slate-100">《Love Stroy》</p>
          </div>
        </div>
        <!-- 游戏 -->
        <div
          class="relative h-52 w-full overflow-hidden rounded-xl md:h-auto md:min-h-[13rem] md:w-[59%]"
        >
          <div class="game-bg absolute h-full w-full bg-cover bg-center bg-no-repeat"></div>
          <div class="relative z-10 flex h-full flex-col justify-between p-4">
            <p class="text-[12px] text-slate-50">电子竞技</p>
            <h1 class="mt-2 flex-1 text-4xl font-bold text-white">赛博种田 / FPS</h1>
            <p class="mt-2 self-end text-right text-sm text-slate-100">王者荣耀 / FarmTogether</p>
          </div>
        </div>
      </div>

      <!-- 运动/电影 -->
      <div class="mt-4 flex w-full flex-col justify-between gap-5 md:flex-row md:gap-0">
        <!-- 电影 -->
        <div class="relative h-72 w-full overflow-hidden rounded-xl md:min-h-[18rem] md:w-[58%]">
          <div class="movie-bg absolute h-72 w-full bg-cover bg-center bg-no-repeat"></div>
          <div class="relative z-10 flex h-full flex-col justify-between p-4">
            <p class="text-[12px] text-slate-50">兴趣爱好</p>
            <h1 class="mt-2 flex-1 text-4xl font-bold text-white">科幻 / <br />动漫影视剧</h1>
            <p class="mt-2 self-end text-right text-sm text-slate-100">
              “我与天道抢妻魂，与岁月争稗修！” ——《仙逆》
            </p>
          </div>
        </div>
        <!-- 运动 -->
        <div class="relative h-72 w-full overflow-hidden rounded-xl md:min-h-[18rem] md:w-[40%]">
          <div class="sport-bg absolute h-72 w-full bg-cover bg-center bg-no-repeat"></div>
          <div class="relative flex h-full flex-col justify-between p-4">
            <p class="text-[12px] text-slate-50">体育运动</p>
            <h1 class="mt-2 flex-1 text-4xl font-bold text-white">乒乓球</h1>
            <p class="mt-2 self-end text-right text-sm text-slate-100">感受乒乓球的魅力-旋转！</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.honer-bg {
  background-image: url('./img/honer.jpg');
}
.music-bg {
  background-image: url('./img/music.jpg');
  filter: brightness(0.6);
}
.game-bg {
  background-image: url('./img/game.png');
  filter: brightness(0.8);
}
.sport-bg {
  background-image: url('./img/sport.png');
  filter: brightness(0.6);
}
.movie-bg {
  background-image: url('./img/movie.webp');
  filter: brightness(0.6);
}
.avatar-ping {
  animation: avatarPing 2s ease-in infinite;
}
@keyframes avatarPing {
  0%,
  100% {
    transform: translateX(-50%) translateY(-50%) scale(1.05);
  }
  50% {
    transform: translateX(-50%) translateY(-50%) scale(1.1);
  }
}
.tag-bounce {
  animation: tagBounce 1.5s ease-in infinite;
}
@keyframes tagBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10%);
  }
}

.icon-scroll {
  animation: iconScroll 20s linear infinite;
}
@keyframes iconScroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
