cmake_minimum_required(VERSION 3.16)
project(RunStockAdmin LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets Network)

add_executable(runstock-admin
  src/main.cpp
  src/apiclient.h
  src/apiclient.cpp
  src/connectionconfig.h
  src/connectionconfig.cpp
  src/theme.h
  src/theme.cpp
  src/titlebar.h
  src/titlebar.cpp
  src/frameless.h
  src/frameless.cpp
  src/tenantdialog.h
  src/tenantdialog.cpp
  src/backupinspectordialog.h
  src/backupinspectordialog.cpp
  src/mainwindow.h
  src/mainwindow.cpp
  src/tenantworkspace.h
  src/tenantworkspace.cpp
  src/itemdialog.h
  src/itemdialog.cpp
  src/documentdialog.h
  src/documentdialog.cpp
  src/themes/resources.qrc
)

target_link_libraries(runstock-admin PRIVATE Qt6::Widgets Qt6::Network)

if(APPLE)
  set_target_properties(runstock-admin PROPERTIES
    MACOSX_BUNDLE TRUE
    MACOSX_BUNDLE_BUNDLE_NAME "RunStock Admin"
    MACOSX_BUNDLE_EXECUTABLE_NAME "runstock-admin"
    MACOSX_BUNDLE_GUI_IDENTIFIER "ai.runstock.admin"
    MACOSX_BUNDLE_BUNDLE_VERSION "1.0.0"
    MACOSX_BUNDLE_SHORT_VERSION_STRING "1.0.0"
    MACOSX_BUNDLE_INFO_STRING "RunStock brand management tool"
  )
endif()
