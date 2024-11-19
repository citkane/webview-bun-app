@echo off

cd /d "%~dp0" || exit /b

if exist "webview" (
    cd webview || exit /b
) else (
    git clone https://github.com/webview/webview.git
    cd webview || exit /b
)

set TARGET_DIR=..\..\..\bin\webview
set TARGET_FILE=%TARGET_DIR%\webview-windows-%PROCESSOR_ARCHITECTURE%.dll

cmake -G Ninja -B build -S . -D CMAKE_BUILD_TYPE=Release ^
-D WEBVIEW_BUILD_DOCS=false -D WEBVIEW_BUILD_EXAMPLES=false -D WEBVIEW_BUILD_TESTS=false ^
-D WEBVIEW_BUILD_STATIC_LIBRARY=false -D WEBVIEW_BUILD_AMALGAMATION=false ^
-D WEBVIEW_ENABLE_CLANG_TIDY=false

cmake --build build

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

dir build
copy build\core\webview.dll "%TARGET_FILE%"
rmdir /s /q build

echo %TARGET_FILE%