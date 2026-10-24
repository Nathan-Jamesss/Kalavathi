$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Install Node.js 20 or newer, then run this again.'}
node server.js
