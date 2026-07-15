<#
.SYNOPSIS
自动提交日志变更的Windows脚本
#>

# 避免 Windows PowerShell 下中文/emoji 输出乱码
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
chcp 65001 > $null

$Date = Get-Date -Format "yyyy-MM-dd"
git add .
git commit -m "log: :sparkles: 打卡 - $Date"
Write-Host "✅ 已提交日志变更: log: 打卡 - $Date"
