# Silent Reader

在 VS Code 编辑器里直接阅读本地 TXT 小说。

Silent Reader 会把小说内容以内联方式显示在当前编辑器中，让你不用切换到单独阅读器窗口，就能选择本地 TXT、翻页、跳章，并继续上次的阅读进度。

## 运行截图

### 内联阅读

<img src="https://raw.githubusercontent.com/linyanm/silent-reader-vscode-extensions/master/assets/screenshots/inline-reading.png" alt="Silent Reader 内联阅读效果" width="720">

### 选择小说

<img src="https://raw.githubusercontent.com/linyanm/silent-reader-vscode-extensions/master/assets/screenshots/select-novel.png" alt="Silent Reader 选择本地 TXT 小说" width="720">

## 功能

- **本地 TXT 阅读**：通过 `Silent Reader: Select Novel` 选择本地 `.txt` 文件后开始阅读。
- **编辑器内联显示**：小说内容显示在当前光标附近，不打开 Webview 或额外阅读窗口。
- **阅读进度保存**：按小说文件路径分别保存进度，下次重新开启阅读时继续上次位置。
- **翻页控制**：支持命令和快捷键翻到上一页、下一页。
- **章节跳转**：自动识别常见章节标题，并通过 Quick Pick 跳转到指定章节。
- **章节内百分比跳转**：可以输入 `0-100` 的百分比，跳到当前章节中的大致位置。
- **可配置显示行数**：可以控制每次插入的小说行数和每行的近似视觉宽度。
- **轻量控制行**：顶部的 `close`、`chapter`、`progress` 和底部的 `prev`、`next` 控制行都可以开关。

## 快速开始

1. 打开任意编辑器文件。
2. 运行 `Silent Reader: Select Novel`，选择一个本地 `.txt` 小说文件。
3. 把光标放到希望显示小说内容的位置。
4. 运行 `Silent Reader: Toggle Reading` 开启阅读。
5. 使用 `Silent Reader: Next Page` / `Silent Reader: Previous Page` 翻页。

关闭阅读显示后，阅读进度仍会保存在本地。下次重新运行 `Silent Reader: Toggle Reading` 时，会从保存的位置继续。

## 命令

| 命令 | 作用 |
| --- | --- |
| `Silent Reader: Select Novel` | 选择要阅读的本地 TXT 小说 |
| `Silent Reader: Toggle Reading` | 开启或关闭当前阅读显示 |
| `Silent Reader: Close Reading` | 关闭阅读显示 |
| `Silent Reader: Jump To Chapter` | 从章节列表跳转到指定章节 |
| `Silent Reader: Jump To Chapter Percent` | 按当前章节百分比跳转 |
| `Silent Reader: Next Page` | 翻到下一页 |
| `Silent Reader: Previous Page` | 翻到上一页 |
| `Silent Reader: Open Settings` | 打开 Silent Reader 设置 |

## 快捷键

| 操作 | Windows / Linux | macOS |
| --- | --- | --- |
| 下一页 | `Ctrl+Alt+Right` | `Cmd+Alt+Right` |
| 上一页 | `Ctrl+Alt+Left` | `Cmd+Alt+Left` |

可以在 VS Code 的 Keyboard Shortcuts 中搜索 `Silent Reader` 修改快捷键。

## 配置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `silentReader.novelPath` | `""` | 本地 TXT 小说文件路径，也可以通过 `Silent Reader: Select Novel` 设置 |
| `silentReader.maxCharsPerLine` | `80` | 每行展示的近似视觉宽度，中文通常按 2、英文数字通常按 1 估算 |
| `silentReader.insertedLines` | `3` | 从当前光标行开始展示的小说正文行数 |
| `silentReader.showProgressLine` | `true` | 是否显示顶部阅读进度行 |
| `silentReader.showTopControlLine` | `true` | 是否显示顶部操作行：`close`、`chapter`、`progress` |
| `silentReader.showControlLine` | `true` | 是否显示底部翻页控制：`prev`、`next` |

## 使用要求

- VS Code 版本需要满足扩展清单中的 `engines.vscode` 要求。
- 小说文件需要是本地 `.txt` 纯文本文件。
- 当前版本面向本地 TXT 阅读场景，不支持在线书源。

## 隐私

- 插件只读取你主动选择的本地 TXT 文件。
- 小说内容不会上传到任何外部服务。
- 阅读进度保存在 VS Code 本地扩展状态中。

## 已知限制

- 章节识别依赖标题规则匹配，不同小说源的切章效果可能不完全一致。
- 当前按 UTF-8 文本处理，非 UTF-8 编码的 TXT 可能出现乱码。
- 阅读内容以内联装饰方式显示，不是独立阅读器视图。

## 反馈

- 问题反馈：<https://github.com/linyanm/silent-reader-vscode-extensions/issues>
- 仓库地址：<https://github.com/linyanm/silent-reader-vscode-extensions>
