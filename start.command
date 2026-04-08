#!/bin/bash

cd "$(dirname "$0")"

EDITOR_PORT=3456
BLOG_PORT=4321

show_menu() {
    EDITOR_PID=$(lsof -Pi :$EDITOR_PORT -sTCP:LISTEN -t 2>/dev/null)
    BLOG_PID=$(lsof -Pi :$BLOG_PORT -sTCP:LISTEN -t 2>/dev/null)
    
    if [ -n "$EDITOR_PID" ]; then
        echo "编辑器状态: ✅ 运行中"
    else
        echo "编辑器状态: ❌ 已停止"
    fi
    
    if [ -n "$BLOG_PID" ]; then
        echo "博客状态:   ✅ 运行中"
    else
        echo "博客状态:   ❌ 已停止"
    fi
    
    echo ""
    echo "  1) 启动编辑器并打开浏览器"
    echo "  2) 关闭编辑器服务"
    echo "  3) 重启编辑器"
    echo "  4) 在浏览器中打开编辑器"
    echo ""
    echo "  5) 启动博客主站并打开浏览器"
    echo "  6) 关闭博客服务"
    echo "  7) 重启博客"
    echo "  8) 在浏览器中打开博客"
    echo ""
    echo "  9) 启动所有服务"
    echo "  0) 退出"
    echo ""
    echo -n "请输入数字: "
}

start_editor() {
    PID=$(lsof -Pi :$EDITOR_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "编辑器已经在运行，直接打开浏览器..."
        open "http://localhost:$EDITOR_PORT"
        return
    fi
    
    echo "正在启动编辑器服务器..."
    cd editor && node server.cjs &
    sleep 2
    
    PID=$(lsof -Pi :$EDITOR_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "✅ 编辑器启动成功，正在打开浏览器..."
        open "http://localhost:$EDITOR_PORT"
    else
        echo "❌ 编辑器启动失败"
    fi
}

stop_editor() {
    PID=$(lsof -Pi :$EDITOR_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        echo "✅ 编辑器服务已关闭"
    else
        echo "ℹ️ 编辑器服务没有在运行"
    fi
}

restart_editor() {
    stop_editor
    sleep 1
    start_editor
}

open_editor() {
    PID=$(lsof -Pi :$EDITOR_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        open "http://localhost:$EDITOR_PORT"
    else
        echo "❌ 编辑器服务未运行，请先启动"
    fi
}

start_blog() {
    PID=$(lsof -Pi :$BLOG_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "博客已经在运行，直接打开浏览器..."
        open "http://localhost:$BLOG_PORT"
        return
    fi
    
    echo "正在启动博客服务器..."
    npm run dev &
    sleep 3
    
    PID=$(lsof -Pi :$BLOG_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "✅ 博客启动成功，正在打开浏览器..."
        open "http://localhost:$BLOG_PORT"
    else
        echo "❌ 博客启动失败"
    fi
}

stop_blog() {
    PID=$(lsof -Pi :$BLOG_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        echo "✅ 博客服务已关闭"
    else
        echo "ℹ️ 博客服务没有在运行"
    fi
}

restart_blog() {
    stop_blog
    sleep 1
    start_blog
}

open_blog() {
    PID=$(lsof -Pi :$BLOG_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        open "http://localhost:$BLOG_PORT"
    else
        echo "❌ 博客服务未运行，请先启动"
    fi
}

start_all() {
    start_editor
    sleep 2
    start_blog
}

while true; do
    show_menu
    read choice
    
    case $choice in
        1)
            echo ""
            start_editor
            ;;
        2)
            echo ""
            stop_editor
            ;;
        3)
            echo ""
            restart_editor
            ;;
        4)
            echo ""
            open_editor
            ;;
        5)
            echo ""
            start_blog
            ;;
        6)
            echo ""
            stop_blog
            ;;
        7)
            echo ""
            restart_blog
            ;;
        8)
            echo ""
            open_blog
            ;;
        9)
            echo ""
            start_all
            ;;
        0)
            echo ""
            echo "再见!"
            exit 0
            ;;
        *)
            echo ""
            echo "❌ 无效选项，请重新输入"
            ;;
    esac
done
