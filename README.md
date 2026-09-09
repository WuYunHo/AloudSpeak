# Echo Speaking Practice

一个以喜爱的演讲、访谈和致辞为素材的英语口语跟练原型。

## Run

```bash
npm install
npm run dev
```

生产构建与浏览器检查：

```bash
npm run build
npm run check:visual
```

浏览器检查使用本机 Microsoft Edge，并要求开发服务器运行在
`http://127.0.0.1:5173/`。

## Current scope

- 完整 MP3 原声播放、进度拖动、音量和速度控制
- 上一句、下一句、循环播放和收藏状态
- 根据真实时间轴自动滚动并高亮当前字幕
- 点击任意字幕跳转到对应音频位置
- 桌面与移动端播放器布局

跟读录音、听写和读写训练暂不包含在当前界面中。

示例封面照片来自 Unsplash：`photo-1475721027785-f74eccf877e2`。

## Source material

`content/donald-trump/2017-inaugural-address/` 包含第一套真实素材：

- `audio.mp3`：2017 年 1 月 20 日特朗普总统就职演说，Wikimedia
  Commons 提供的公开领域 MP3 转码。
- `transcript-official.md`：Trump White House Historical Archive 发布的
  官方准备稿；它不是按原声逐字转写的版本。
- `metadata.json`：日期、时长、来源链接、许可和音频 SHA-256。
- `captions-en.vtt`：Wikimedia 视频英文字幕，共 185 个原始提示。
- `lesson.json`：由字幕生成的 78 个带起止时间训练句段。
- `translations-zh-CN.json`：与 78 个训练句段逐项对应的简体中文译文。

这套素材已经作为应用默认课程导入，并直接驱动播放器和中英双语滚动字幕。

运行 `npm run fetch:trump:inaugural` 可以重新抓取稿件、下载缺失的音频并
更新元数据。脚本不会重复下载已经存在的 `audio.mp3`。
