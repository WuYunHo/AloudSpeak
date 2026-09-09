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

`content/donald-trump/` 目前包含 3 套真实素材，共 202 个双语时间段：

- `2017-inaugural-address/`：2017 年就职演说，78 个句段。
- `2018-syria-address/`：2018 年叙利亚全国讲话，50 个句段。
- `2020-address-to-the-nation/`：2020 年 3 月全国讲话，74 个句段。

每套目录都包含 `audio.mp3`、`captions-en.vtt`、`lesson.json`、
`translations-zh-CN.json` 和 `metadata.json`。音视频及英文字幕来自 Wikimedia
Commons 的公开领域资源；2017、2020 演讲同时保存了 Trump White House
Historical Archive 的官方准备稿，2018 演讲保存由字幕整理的文本并明确标注为
`caption-transcript`。

运行 `npm run fetch:trump:inaugural` 可以重新抓取稿件、下载缺失的音频并
更新元数据。脚本不会重复下载已经存在的 `audio.mp3`。

运行以下命令可重新抓取新增两篇素材，并校验全部三篇的音频、哈希、字幕、
句段和中文翻译：

```bash
npm run fetch:trump:addresses
npm run verify:trump:materials
```
