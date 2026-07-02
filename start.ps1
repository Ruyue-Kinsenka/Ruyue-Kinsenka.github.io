$EDITOR_PORT = 3456
$BLOG_PORT = 4321

function Get-ProcessIdByPort($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        return $conn.OwningProcess
    }
    return $null
}

function Wait-ForPort($port, $timeoutSeconds) {
    $endTime = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $endTime) {
        $processId = Get-ProcessIdByPort $port
        if ($processId) {
            Start-Sleep -Seconds 1
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Open-Browser($url) {
    try {
        Start-Process $url -ErrorAction Stop
    } catch {
        try {
            Start-Process "explorer.exe" $url
        } catch {
            Write-Host "[i] 无法自动打开浏览器，请手动访问: $url"
        }
    }
}

function Show-Menu {
    $editorPid = Get-ProcessIdByPort $EDITOR_PORT
    $blogPid = Get-ProcessIdByPort $BLOG_PORT

    if ($editorPid) {
        Write-Host "编辑器状态: [运行中]"
    } else {
        Write-Host "编辑器状态: [已停止]"
    }

    if ($blogPid) {
        Write-Host "博客状态:   [运行中]"
    } else {
        Write-Host "博客状态:   [已停止]"
    }

    Write-Host ""
    Write-Host "  1) 启动编辑器并打开浏览器"
    Write-Host "  2) 关闭编辑器服务"
    Write-Host "  3) 重启编辑器"
    Write-Host "  4) 在浏览器中打开编辑器"
    Write-Host ""
    Write-Host "  5) 启动博客主站并打开浏览器"
    Write-Host "  6) 关闭博客服务"
    Write-Host "  7) 重启博客"
    Write-Host "  8) 在浏览器中打开博客"
    Write-Host ""
    Write-Host "  9) 启动所有服务"
    Write-Host "  0) 退出"
    Write-Host ""
}

function Start-Editor {
    $processId = Get-ProcessIdByPort $EDITOR_PORT
    if ($processId) {
        Write-Host "编辑器已经在运行，直接打开浏览器..."
        Open-Browser "http://localhost:$EDITOR_PORT"
        return
    }

    Write-Host "正在启动编辑器服务器..."
    $editorDir = Join-Path $PSScriptRoot "editor"
    Start-Process node -ArgumentList "server.cjs" -WorkingDirectory $editorDir -WindowStyle Hidden

    Write-Host "等待服务就绪..."
    $ready = Wait-ForPort $EDITOR_PORT -TimeoutSeconds 10
    if ($ready) {
        Write-Host "[ok] 编辑器启动成功，正在打开浏览器..."
        Open-Browser "http://localhost:$EDITOR_PORT"
    } else {
        Write-Host "[x] 编辑器启动超时，请检查是否有报错"
    }
}

function Stop-Editor {
    $processId = Get-ProcessIdByPort $EDITOR_PORT
    if ($processId) {
        Stop-Process -Id $processId -Force
        Write-Host "[ok] 编辑器服务已关闭"
    } else {
        Write-Host "[i] 编辑器服务没有在运行"
    }
}

function Restart-Editor {
    Stop-Editor
    Start-Sleep -Seconds 1
    Start-Editor
}

function Open-Editor {
    $processId = Get-ProcessIdByPort $EDITOR_PORT
    if ($processId) {
        Open-Browser "http://localhost:$EDITOR_PORT"
    } else {
        Write-Host "[x] 编辑器服务未运行，请先启动"
    }
}

function Start-Blog {
    $processId = Get-ProcessIdByPort $BLOG_PORT
    if ($processId) {
        Write-Host "博客已经在运行，直接打开浏览器..."
        Open-Browser "http://localhost:$BLOG_PORT"
        return
    }

    if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
        Write-Host "[x] 尚未安装依赖，请先运行: npm install"
        return
    }

    Write-Host "正在启动博客服务器..."
    $blogCommand = "cd '$PSScriptRoot'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $blogCommand

    Write-Host "等待服务就绪..."
    $ready = Wait-ForPort $BLOG_PORT -TimeoutSeconds 20
    if ($ready) {
        Write-Host "[ok] 博客启动成功，正在打开浏览器..."
        Open-Browser "http://localhost:$BLOG_PORT"
    } else {
        Write-Host "[x] 博客启动超时，请检查新打开的终端窗口中的错误信息"
    }
}

function Stop-Blog {
    $processId = Get-ProcessIdByPort $BLOG_PORT
    if ($processId) {
        Stop-Process -Id $processId -Force
        Write-Host "[ok] 博客服务已关闭"
    } else {
        Write-Host "[i] 博客服务没有在运行"
    }
}

function Restart-Blog {
    Stop-Blog
    Start-Sleep -Seconds 1
    Start-Blog
}

function Open-Blog {
    $processId = Get-ProcessIdByPort $BLOG_PORT
    if ($processId) {
        Open-Browser "http://localhost:$BLOG_PORT"
    } else {
        Write-Host "[x] 博客服务未运行，请先启动"
    }
}

function Start-All {
    Start-Editor
    Start-Sleep -Seconds 2
    Start-Blog
}

while ($true) {
    Show-Menu
    $choice = Read-Host "请输入数字"

    switch ($choice) {
        "1" { Start-Editor }
        "2" { Stop-Editor }
        "3" { Restart-Editor }
        "4" { Open-Editor }
        "5" { Start-Blog }
        "6" { Stop-Blog }
        "7" { Restart-Blog }
        "8" { Open-Blog }
        "9" { Start-All }
        "0" { Write-Host "再见!"; exit }
        default { Write-Host "[x] 无效选项，请重新输入" }
    }
}
