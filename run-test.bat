@echo off
ECHO Running NBA Dallas Mavericks 3-Point Test in headless mode...
ECHO.

:: Load API key from .env file if it exists
IF EXIST ".env" (
  ECHO Loading environment variables from .env file...
  FOR /F "tokens=*" %%A IN ('findstr /B "API_KEY" .env') DO (
    SET %%A
  )
) ELSE (
  ECHO WARNING: .env file not found. Please create one with your API_KEY.
)

:: Check if API_KEY is set
IF "%API_KEY%"=="" (
  ECHO ERROR: API_KEY is not set. Please create a .env file with your API key.
  ECHO Example content for .env file:
  ECHO API_KEY=your_api_key_here
  EXIT /B 1
)

:: Enable headless mode for CI
SET HEADLESS=true

:: Set workers based on parameter (default to 1 if not provided)
IF "%1"=="" (
  SET WORKERS=1
) ELSE (
  SET WORKERS=%1
)

:: Display worker count
ECHO Using %WORKERS% worker(s)

:: Show a message that test is running
ECHO Running tests, please wait...
ECHO.

:: Run the test directly with the specified worker count
npx playwright test --workers=%WORKERS%

ECHO.
ECHO Test complete! 