$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "SectorRotationTerminal\SectorRotationTerminal.csproj"
$output = Join-Path $PSScriptRoot "publish\win-x64"

dotnet restore $project
dotnet publish $project `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  -p:PublishSingleFile=false `
  --output $output

Write-Host "Published desktop application to $output"
Write-Host "Run SectorRotationTerminal.exe. The Microsoft Edge WebView2 Runtime must be installed."
