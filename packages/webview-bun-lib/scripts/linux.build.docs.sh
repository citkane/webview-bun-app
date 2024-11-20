#! /bin/bash

cd "$(dirname "$0")" || exit

if [ -d "webview" ]; then
    cd webview || exit
else
    git clone https://github.com/webview/webview.git
    cd webview || exit
fi

TARGET_DIR=../../docs

cmake -G Ninja -B build -S . -Wno-dev -D CMAKE_BUILD_TYPE=Release \
-D WEBVIEW_BUILD_DOCS=true -D WEBVIEW_BUILD_EXAMPLES=false -D WEBVIEW_BUILD_TESTS=false -D WEBVIEW_BUILD=false\
-D WEBVIEW_BUILD_STATIC_LIBRARY=false -D WEBVIEW_BUILD_AMALGAMATION=false -D WEBVIEW_BUILD_STATIC_LIBRARY=false\
-D WEBVIEW_ENABLE_CLANG_TIDY=false -D WEBVIEW_ENABLE_CLANG_FORMAT=false \
-D WEBVIEW_WEBKITGTK_API=4.1

cmake --build build
cp -r build/docs/api/output/html "$TARGET_DIR"
rm -rf build