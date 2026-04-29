@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM =========================================================
REM   智能舍友分配系统 - 一键启动脚本 (Windows)
REM   功能：环境检查 + 依赖安装 + 启动前后端
REM =========================================================

title Roommate Allocation - Quick Start

echo.
echo ============================================================
echo    智能舍友分配系统 - 快速启动
echo ============================================================
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM ----------- 1. 检查 Node.js -----------
echo [1/5] 检查 Node.js 环境...
where node > nul 2>&1
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 Node.js。
    echo        请先安装 Node.js v14 或更高版本：https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo        Node.js 版本: !NODE_VERSION!

where npm > nul 2>&1
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 npm。请确认 Node.js 安装完整。
    echo.
    pause
    exit /b 1
)

REM ----------- 2. 检查 .env -----------
echo.
echo [2/5] 检查后端环境变量配置...
if not exist "src\server\.env" (
    echo.
    echo [错误] 未找到 src\server\.env 文件。
    echo.
    if exist "src\server\.env.example" (
        echo        已为您从模板复制一份，请编辑该文件填入真实的 API Key 后重新运行此脚本：
        copy "src\server\.env.example" "src\server\.env" > nul
        echo        已复制：src\server\.env.example -^> src\server\.env
        echo.
        echo        请打开 src\server\.env，至少填写 DEEPSEEK_API_KEY 后重新运行 start.bat
    ) else (
        echo        请在 src\server\ 目录下创建 .env 文件，参考 README.md 中的环境变量说明。
    )
    echo.
    pause
    exit /b 1
)
echo        ✓ 找到 src\server\.env

REM ----------- 3. 安装前端依赖 -----------
echo.
echo [3/5] 检查/安装前端依赖...
if not exist "node_modules" (
    echo        node_modules 不存在，开始执行 npm install ...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 前端依赖安装失败。请检查网络或 npm 配置。
        echo        建议：npm config set registry https://registry.npmmirror.com
        echo.
        pause
        exit /b 1
    )
) else (
    echo        ✓ 前端依赖已安装
)

REM ----------- 4. 安装后端依赖 -----------
echo.
echo [4/5] 检查/安装后端依赖...
if not exist "src\server\node_modules" (
    echo        后端 node_modules 不存在，开始执行 npm install ...
    pushd "src\server"
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 后端依赖安装失败。请检查网络或 npm 配置。
        echo.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo        ✓ 后端依赖已安装
)

REM ----------- 5. 启动前后端 -----------
echo.
echo [5/5] 启动前后端服务...
echo.
echo        - 后端将运行在 http://localhost:3000
echo        - 前端将运行在 http://localhost:8080
echo        - 关闭对应的命令行窗口即可停止服务
echo.

REM 启动后端（独立窗口，使用 src/server 作为工作目录）
start "Roommate Backend (Port 3000)" cmd /k "cd /d "%~dp0src\server" && echo [后端启动中] 端口 3000... && npm run dev || (echo. && echo [后端已退出] 请检查上方错误信息 && pause)"

REM 等待 2 秒，避免端口竞争
timeout /t 2 /nobreak > nul

REM 启动前端（独立窗口）
start "Roommate Frontend (Port 8080)" cmd /k "cd /d "%~dp0" && echo [前端启动中] 端口 8080... && npm run serve || (echo. && echo [前端已退出] 请检查上方错误信息 && pause)"

echo.
echo ============================================================
echo    启动完成！请等待编译完成后访问：
echo      前端：http://localhost:8080
echo      后端：http://localhost:3000
echo ============================================================
echo.
echo    若前端或后端窗口提示错误，请查看对应窗口的日志。
echo    常见问题：
echo      - 数据库连接失败：确认 MySQL 已启动，且 src\server\config\db.js
echo        中的用户名/密码与本地一致。
echo      - 端口被占用：修改 src\server\.env 中的 PORT，或关闭占用进程。
echo      - DEEPSEEK_API_KEY 未配置：在 src\server\.env 中填入真实 Key。
echo.
echo  按任意键关闭此启动窗口（前后端窗口会继续运行）。
pause > nul
endlocal
