# Echo Speaking Practice

一个以喜爱的演讲、访谈和致辞为素材的原声跟练原型，支持英语与粤语内容。

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

`content/ted/` 包含指定 Bilibili 合集 P1-P5 对应的 5 套 TED 素材，共 638 个
双语时间段：

- Emily Esfahani Smith：`There's more to life than being happy`
- Wendy Suzuki：`The brain-changing benefits of exercise`
- Anjali Sud and Stephanie Mehta：`How great leaders take on uncertainty`
- Daniel Alexander Jones：`What to do when everything feels broken`
- Kate Raworth：`A healthy economy should be designed to thrive, not grow`

每套 TED 目录包含 `audio.mp3`、`cover.jpg`、`transcript-en.md`、
`transcript-zh-CN.md`、`captions-en.vtt`、`lesson.json`、
`translations-zh-CN.json` 和 `metadata.json`。音频来自用户指定的 Bilibili 合集
P1-P5，英文稿、简体中文译文和封面来自对应的 TED 官方页面；具体来源、分 P、
CID、文件哈希和权利说明记录在各目录的 `metadata.json` 中。

运行以下命令可补齐或重新生成 TED 素材，并验证音频、封面、哈希、时间轴和译文
覆盖率：

```bash
npm run fetch:ted:bilibili
npm run verify:ted:materials
```

`content/cantonese/leon-lai/` 包含 5 套黎明的香港粤语访谈素材：

- 2016《一綫娛樂》专访
- 2017 ViuTV《Interviu》专访
- 2016 叱咤 903 电台访问短版
- 2016《口水多過浪花》完整访问
- 1993《海角天涯》电台访问

每套目录包含 MP3 原声、独立封面、香港繁体逐句字幕、VTT 时间轴和来源元数据。
字幕由本地语音模型生成，经过去重、异常片段过滤和繁体转换；它们在界面中明确标注为
粤语机器字幕，不作为人工逐字稿。运行以下命令可重建并校验五套素材：

```bash
npm run build:leon:cantonese
npm run verify:leon:cantonese
```
