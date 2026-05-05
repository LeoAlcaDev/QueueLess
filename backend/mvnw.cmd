@REM ---------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.2
@REM ---------------------------------------------------------------------------
@echo off
@setlocal

set ERROR_CODE=0

if not "%JAVA_HOME%"=="" goto OkJHome
echo Error: JAVA_HOME not found in your environment. >&2
goto error

:OkJHome
if exist "%JAVA_HOME%\bin\java.exe" goto chkMHome
echo Error: JAVA_HOME is set to an invalid directory. >&2
goto error

:chkMHome
set MAVEN_PROJECTBASEDIR=%~dp0
set WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar

if exist "%WRAPPER_JAR%" goto execWrapper
for /f "usebackq delims==" %%G in (`findstr /b "wrapperUrl=" "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties"`) do (
  set "WRAPPER_URL=%%G"
)
set WRAPPER_URL=%WRAPPER_URL:wrapperUrl=%
powershell -Command "Invoke-WebRequest -Uri '%WRAPPER_URL%' -OutFile '%WRAPPER_JAR%'"

:execWrapper
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain
"%JAVA_HOME%\bin\java.exe" %MAVEN_OPTS% -classpath "%WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %*
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@endlocal
exit /b %ERROR_CODE%
