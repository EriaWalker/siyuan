# 开发与测试命令

## 内核

编译
```powershell
cd F:\SiYuan\siyuan\kernel
$env:CGO_ENABLED="1" #启用CGO
go build -tags "fts5" -o "../app/kernel/SiYuan-Kernel.exe" # 启用SQL索引链接库
```

运行
```powershell
F:\SiYuan\siyuan\app\kernel\SiYuan-Kernel.exe --wd=.. --mode=dev --workspace F:\SiYuan\test-workspace
```