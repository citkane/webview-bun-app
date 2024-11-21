@echo off

cd /d "%~dp0" || exit /b

if exist "webview" (
    cd webview || exit /b
) else (
    git clone https://github.com/webview/webview.git
    cd webview || exit /b
)

set TARGET_DIR=..\..\bin
set TARGET_FILE=%TARGET_DIR%\llibwebview-windows-%PROCESSOR_ARCHITECTURE%.dll

cmake -G Ninja -B build -S . -Wno-dev -D CMAKE_BUILD_TYPE=Release ^
-D WEBVIEW_BUILD_DOCS=false -D WEBVIEW_BUILD_EXAMPLES=false -D WEBVIEW_BUILD_TESTS=false ^
-D WEBVIEW_BUILD_STATIC_LIBRARY=false -D WEBVIEW_BUILD_AMALGAMATION=false ^
-D WEBVIEW_ENABLE_CLANG_TIDY=false

cmake --build build

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
copy build\core\libwebview.dll "%TARGET_FILE%"
rmdir /s /q build
