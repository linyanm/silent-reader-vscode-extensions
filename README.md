# Silent Reader

直接在 VS Code 里阅读本地 TXT 小说。

Silent Reader 是一个放在编辑器里的轻量阅读插件。你不需要切换到单独的阅读器窗口，只要选中一本本地 TXT 小说，就可以在当前编辑器里直接翻页、跳章，并继续上次的阅读进度。

它适合想在写代码、记笔记或日常使用 VS Code 时，顺手读一会儿小说的人。

## 为什么选择 Silent Reader

- 不用离开当前 VS Code 工作区，直接就能开始阅读。
- 小说内容会显示在当前光标附近，阅读时不需要切到别的窗口。
- 可以按章节跳转，也可以在当前章节里按进度跳转。
- 会为每本已选择的 TXT 小说单独保存阅读进度。
- 顶部操作行和底部翻页控制都可以单独开关，界面更轻量。

## 功能特性

- 在当前编辑器里以内联方式展示小说内容。
- 自动识别章节并建立索引，方便快速跳转。
- 支持按章节跳转，也支持按当前章节百分比跳转。
- 自动保存每本书的阅读进度，下次可以接着读。
- 可选顶部操作行和底部翻页按钮。
- 光标靠近编辑器底部时会自动调整显示位置，避免阅读内容被截断。

## 快速开始

1. 运行 `Silent Reader: Select Novel`，选择一个本地 `.txt` 小说文件。
2. 在当前编辑器里把光标放到你想开始显示阅读内容的位置。
3. 运行 `Silent Reader: Toggle Reading`，开启当前会话的阅读模式。
4. 开启后，小说内容会从当前光标附近开始显示。
5. 使用 `Silent Reader: Next Page` 和 `Silent Reader: Previous Page` 翻页。
6. 需要跳转时，使用 `Silent Reader: Jump To Chapter` 或 `Silent Reader: Jump To Chapter Percent`。

如果你关闭了阅读模式，或者下次重新打开 VS Code，只需要重新开启阅读，就可以继续从上次的进度接着看。

## 命令

- `Silent Reader: Select Novel`：选择要阅读的本地 TXT 小说。
- `Silent Reader: Toggle Reading`：开启或关闭当前会话中的阅读模式。
- `Silent Reader: Close Reading`：关闭当前阅读显示。
- `Silent Reader: Jump To Chapter`：跳转到指定章节。
- `Silent Reader: Jump To Chapter Percent`：按当前章节进度跳转。
- `Silent Reader: Next Page`：下一页。
- `Silent Reader: Previous Page`：上一页。
- `Silent Reader: Open Settings`：打开插件设置。

## 快捷键

- 下一页：`Ctrl+Alt+Right`，macOS：`Cmd+Alt+Right`
- 上一页：`Ctrl+Alt+Left`，macOS：`Cmd+Alt+Left`

你可以在 VS Code 的 Keyboard Shortcuts 中搜索 `Silent Reader` 来修改这些快捷键。

## 配置项

- `silentReader.novelPath`：本地 TXT 小说文件路径。
- `silentReader.maxCharsPerLine`：每行的近似显示宽度。默认 `80`。
- `silentReader.showControlLine`：是否显示底部翻页控制行。默认 `true`。
- `silentReader.showTopControlLine`：是否显示顶部操作行。默认 `true`。
- `silentReader.showProgressLine`：是否显示阅读进度行。默认 `true`。
- `silentReader.insertedLines`：从当前光标行开始插入的小说行数。默认 `3`。

如果你想更精简一点，可以关闭顶部操作行或底部翻页控制行。

开启顶部控制行后，会显示可点击的 `close`、`chapter` 和 `progress` 操作。

开启底部控制行后，会显示可点击的 `prev` 和 `next` 操作。

## 使用要求

- 使用与扩展清单兼容的 VS Code 版本。
- 准备一个本地 `.txt` 纯文本小说文件。
- 当前版本面向本地 TXT 阅读场景，不支持在线书源。

## 隐私说明

- 插件只会读取你主动选择的本地 `.txt` 文件。
- 小说内容和阅读进度都保留在你的本地机器上。
- 扩展不会把小说内容上传到任何外部服务。

## 已知问题

- 目前只支持本地 `.txt` 文件。
- 章节识别依赖标题规则匹配，不同小说源的切章效果可能不完全一致。
- 阅读内容目前以内联装饰的方式显示，不是独立的阅读器视图。

## 反馈

- 问题反馈：<https://github.com/linyanm/silent-reader-vscode-extensions/issues>
- 仓库地址：<https://github.com/linyanm/silent-reader-vscode-extensions>
