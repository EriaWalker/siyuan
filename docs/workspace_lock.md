
这个错误说明**同一个工作空间被多个 Kernel 进程同时占用**。

## 错误原因

SiYuan 有一个**工作空间锁定机制**来防止数据损坏：

```go
func tryLockWorkspace() {
    WorkspaceLock = flock.New(filepath.Join(WorkspaceDir, ".lock"))
    ok, err := WorkspaceLock.TryLock()
    if ok {
        return  // ✅ 获取锁成功
    }
    // ❌ 获取锁失败，说明有其他进程已经锁定了这个工作空间
    os.Exit(logging.ExitCodeWorkspaceLocked)
}
```

你的情况：
1. 旧版思源笔记运行时，占用了 test-workspace 的锁文件
2. 新版开发内核启动时，试图锁定同一个工作空间，但失败了
3. 因此报错并退出

## 解决方案

**方案 1: 关闭旧版思源笔记（推荐）**
```bash
# 先完全关闭旧版思源笔记
# 然后运行新版开发内核
F:\SiYuan\siyuan\app\kernel\SiYuan-Kernel.exe --wd=.. --mode=dev --workspace F:\SiYuan\test-workspace
```

**方案 2: 使用不同的工作空间**
```bash
# 为开发内核指定一个新的工作空间，不与旧版冲突
F:\SiYuan\siyuan\app\kernel\SiYuan-Kernel.exe --wd=.. --mode=dev --workspace F:\SiYuan\dev-workspace
```

**方案 3: 手动删除锁文件（不推荐）**
```bash
# 只在确认没有其他 SiYuan 进程运行时执行
rm F:\SiYuan\test-workspace\.lock
```

## 技术说明

- 锁文件位置：`<WorkspaceDir>\.lock`
- 目的：保证一次只有一个 Kernel 进程访问工作空间，防止并发修改导致数据损坏
- 这是 SiYuan 的**设计限制**，不是 bug

**建议**：开发时使用不同的工作空间，将旧版和新版分离，避免冲突。