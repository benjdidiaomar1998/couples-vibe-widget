@if "%DEBUG%"=="" @echo off
@rem Gradle startup script for Windows

setlocal
set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set CMD_LINE_ARGS=
:winLoop
if "%1"=="" goto doneWinLoop
set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
shift
goto winLoop
:doneWinLoop

set CLASSPATH=%DIRNAME%\gradle\wrapper\gradle-wrapper.jar

if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%"=="0" goto execute

echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%\bin\java.exe

if exist "%JAVA_EXE%" goto execute

echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
goto fail

:execute
"%JAVA_EXE%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %CMD_LINE_ARGS%

:fail
if not "%GRADLE_EXIT_CONSOLE%"=="" exit %ERRORLEVEL%
exit /b %ERRORLEVEL%
