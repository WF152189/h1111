@REM Maven Wrapper startup batch script
@REM ---------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation
@REM ---------------------------------------------------------------------------
@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0

@REM Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome
set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %errorlevel% equ 0 goto init
echo Error: JAVA_HOME is not set and no 'java' command could be found in your PATH. >&2
goto error

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%\bin\java.exe
if exist "%JAVA_EXE%" goto init
echo Error: JAVA_HOME is set to an invalid directory: %JAVA_HOME% >&2
goto error

:init
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"

@REM Execute Maven Wrapper
"%JAVA_EXE%" ^
  -jar %WRAPPER_JAR% %*
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
endlocal & exit /b %ERROR_CODE%
