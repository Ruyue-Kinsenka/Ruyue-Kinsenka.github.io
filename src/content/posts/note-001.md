---
title: Note-在AOSP上实现屏幕超时提醒的小笔记
description: 
publishedAt: 2026-04-09
category: AOSP
tags:
  - aosp
  - pms
draft: false
---

## 前言
在使用Flyme时，有一项小功能我一直觉得但用难回
![tmp_769078496_S60409-16372330_com.meizu.suggestion.png](/images/upload-1775723875795-gt621r.png)
即Aicy建议
具体有什么用呢，在一些特定的上下文场景中，浓缩一些高频操作，简化操作步骤
其中我个人用的比较多的即-屏幕超时（临时开启屏幕常亮）
有人可能会说
> “啊这个功能，oem不都有么，那个注释屏幕不息屏不就完美契合这个场景”

但我实际用下来，我发现这两个功能完全是应用不同的应用场景
**注视屏幕不息屏**-首先用户的视觉焦点一定是在屏幕上，且用户一定是正对着屏幕，才能被摄像头检测到，才会触发此功能，但此时用户一般都是会聚焦于一些-阅读文章，观看视频，视频通话等等场景；对这类场景来说用户会去主动操作手机亦或是用户正在操作的软件，此软件已经考虑到超时未操作场景做了屏幕常亮设置等等，所以在我看来这个特性的应用场景实在是有些许**吃力**，若厂商未做好优化，实时调用摄像头的功耗成本可不低（或许可以使用其他传感器？抱歉这类具体实现我没有细致深入，仅凭我第一使用印象来推测，若出现错误欢迎指正修改）

Flyme的产品经理的小巧思让我觉得他们是真的在用自己的产品；既然用户在操作手机，那我们结合用户的操作上下文来判断用户意图，如果用户希望屏幕常亮，那么他一定会在屏幕超时即将熄屏的dim状态，去点击屏幕刷新屏幕超时时间，那用户肯定是希望屏幕**暂时**常亮的，于是我们可以将传统的-下滑状态栏-点击屏幕常亮-退出状态栏，直接融合到一步到位，从左下角弹出快捷浮窗，避开用户视觉焦点中心，但又使用艳色去获取一定的关注，诱导用户去点击这个浮窗，再去决定是否**临时常亮**此次屏幕
![S60409-16565793_com.meizu.suggestion(1).png](/images/upload-1775725059389-r0vmtx.png)

其他的功能-比如
**快捷打开音乐软件**-用户戴上耳机可能要干嘛-可能要听歌啊，那我帮你快捷打开
**复制应用文本时跳转到此应用**-用户复制了比如淘宝链接下一步要干嘛-可能是打开淘宝查看此商品啊，那我帮你快捷打开
等等。。。

## 正文
一些功能的复刻，比如检测手电筒是否开启，链接耳机检测，对复制文本进行正则匹配等等，这些android都提供了官方的接口去检测，这里不再赘述，我主要分享一下我如何去实现发出用户点击了dim状态屏幕的事件的
⚠️：本人非专业android开发者，仅分享一些蠢蠢的思路作为学习路上的笔记，重点是供未来的自己取乐，如有更专业完美的方法我愿意学习

我们来阅读android的源代码，让我们把目光聚焦于PowerManagerService.java‎中，这里是android的电源管理的核心，其中也包含了关于用户活动检测与响应相关部分
这里引用一下我在其他blog学习到有关于android熄屏流程的解析
> 更新用户行为updateUserActivitySummaryLocked：
这个函数不单单是用于更新用户行为，还更新了屏幕超时时间，并且以这个时间来定时更新电源状态，以实现自动灭屏的功能。
更新用户行为在第1步，前面分析更新 wakefulness 时，PMS 保存了唤醒的时间 mLastWakeTime。因此，对于从灭屏状态到亮屏状态这一过程来说，用户行为的值现在是 mUserActivitySummary = USER_ACTIVITY_SCREEN_BRIGHT，表示用户行为是亮屏。
来自大佬LXJSWD

这位大佬对于熄屏流程剖析的很细致，很推荐一看
我们将目光聚焦于updateUserActivitySummaryLocked此函数
我们来阅读源码，可以看到这一串计算用户屏幕超时的逻辑
我们来回想一下我们的手机是如何熄屏的
最高亮度-稍微暗下去-完全熄屏
存在三个阶段，我们来看代码
```
if (wakefulness != WAKEFULNESS_ASLEEP) { 
    final long lastUserActivityTime = powerGroup.getLastUserActivityTimeLocked();
    
    // BRIGHT—用户活动
    groupNextTimeout = lastUserActivityTime + screenOffTimeout - screenDimDuration;
    if (now < groupNextTimeout) {
        groupUserActivitySummary = USER_ACTIVITY_SCREEN_BRIGHT;
        // ...
    } 
    // DIM-屏幕超时即将到达设定时间，进行降低亮度处理
    else {
        groupNextTimeout = lastUserActivityTime + screenOffTimeout;
        if (now < groupNextTimeout) {
            groupUserActivitySummary = USER_ACTIVITY_SCREEN_DIM;
        }
    }
    
    // ...
}
```
我们很容易得知aosp中判断进入dim的逻辑
```
groupNextTimeout = lastUserActivityTime + screenOffTimeout - screenDimDuration
```
首先计算最高亮度结束时间（距离用户上一次操作）
lastUserActivityTime：用户上一次操作时间
screenOffTimeout：用户设定的何时熄屏
screenDimDuration：暗屏（dim）持续时间

通过判断是通过if-else
如果now < groupNextTimeout，说明现在还未到最高亮度结束的时间
设定
```
groupUserActivitySummary = USER_ACTIVITY_SCREEN_BRIGHT;
```
如果超过了高亮时间，就设定
```
groupUserActivitySummary = USER_ACTIVITY_SCREEN_DIM;
```
我们已经了解了进入dim的方式，那我们就可以做如下更改
```
final int oldSummary = powerGroup.getUserActivitySummaryLocked();
powerGroup.setUserActivitySummaryLocked(groupUserActivitySummary);

if(oldSummary == USER_ACTIVITY_SCREEN_DIM &&
    groupUserActivitySummary == USER_ACTIVITY_SCREEN_BRIGHT) {
    sendTimeoutBroadcast();
}
```
首先我们在状态被清除前，创建一个新的变量去存储上一次的groupUserActivitySummary，
如果oldSummary是USER_ACTIVITY_SCREEN_DIM**并且**这一次get到USER_ACTIVITY_SCREEN_是BRIGHT
那就说明用户是从dim状态切换到bright状态，那么我们就可以在这个条件下，发送我们的屏幕超时被取消的标志了～

## Over
诶不是，你怎么似啦（指meizu）