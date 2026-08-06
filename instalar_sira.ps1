param([switch]$SinAccesoDirecto)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$raiz = $PSScriptRoot
$backend = Join-Path $raiz "backend"
$frontend = Join-Path $raiz "frontend"
$pythonVenv = Join-Path $backend ".venv\Scripts\python.exe"

function Mensaje([string]$texto, [string]$color = "Gray") { Write-Host " $texto" -ForegroundColor $color }
function Fallar([string]$texto) {
    Mensaje "[ERROR] $texto" "Red"
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

Write-Host ""
Write-Host " =====================================================" -ForegroundColor Green
Write-Host "   INSTALADOR DE SIRA PARA WINDOWS" -ForegroundColor Green
Write-Host " =====================================================" -ForegroundColor Green
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Fallar "Instala Python 3.11 o superior desde python.org y marca Add Python to PATH."
}
$versionPython = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$pythonCompatible = & python -c "import sys; print('SI' if sys.version_info >= (3, 11) else 'NO')"
if ($pythonCompatible -ne "SI") { Fallar "SIRA necesita Python 3.11 o superior; se encontro $versionPython." }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fallar "Instala Node.js 20 LTS o superior desde nodejs.org."
}
$nodeVersion = (& node --version).Trim()
$nodeMayor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($nodeMayor -lt 20) { Fallar "SIRA necesita Node.js 20 o superior; se encontro $nodeVersion." }

Mensaje "[1/6] Requisitos correctos: Python $versionPython y Node.js $nodeVersion." "Cyan"
if (-not (Test-Path $pythonVenv)) {
    Mensaje "[2/6] Creando el entorno virtual..." "Cyan"
    & python -m venv (Join-Path $backend ".venv")
} else { Mensaje "[2/6] Actualizando el entorno existente..." "Cyan" }

Mensaje "[3/6] Instalando backend y comunicacion serial..." "Cyan"
& $pythonVenv -m pip install --disable-pip-version-check --upgrade pip
if ($LASTEXITCODE -ne 0) { Fallar "No se pudo preparar pip." }
& $pythonVenv -m pip install --disable-pip-version-check -r (Join-Path $backend "requirements.txt") -r (Join-Path $raiz "simulator\requirements.txt")
if ($LASTEXITCODE -ne 0) { Fallar "No se pudieron instalar los paquetes de Python. Revisa Internet." }

Mensaje "[4/6] Creando configuracion y catalogo de cultivos..." "Cyan"
$envDestino = Join-Path $raiz ".env"
if (-not (Test-Path $envDestino)) { Copy-Item -LiteralPath (Join-Path $raiz ".env.example") -Destination $envDestino }
Push-Location $backend
try {
    & $pythonVenv -m app.scripts.seed_cultivos
    if ($LASTEXITCODE -ne 0) { Fallar "No se pudo crear el catalogo de cultivos." }
} finally { Pop-Location }

Mensaje "[5/6] Instalando y compilando la interfaz web..." "Cyan"
Push-Location $frontend
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { Fallar "No se pudieron instalar los paquetes web." }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { Fallar "No se pudo compilar la interfaz web." }
} finally { Pop-Location }

Mensaje "[6/6] Creando acceso directo..." "Cyan"
if (-not $SinAccesoDirecto) {
    $acceso = Join-Path ([Environment]::GetFolderPath("Desktop")) "Iniciar SIRA.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($acceso)
    $shortcut.TargetPath = Join-Path $raiz "iniciar_sira.bat"
    $shortcut.WorkingDirectory = $raiz
    $shortcut.Description = "Sistema Inteligente de Riego Agricola"
    $shortcut.Save()
}
Set-Content -LiteralPath (Join-Path $raiz ".sira-instalado") -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Encoding UTF8

Write-Host ""
Mensaje "[OK] SIRA se instalo correctamente." "Green"
Mensaje "Usa el acceso Iniciar SIRA del escritorio o iniciar_sira.bat." "White"
Write-Host ""
Read-Host "Presiona Enter para cerrar"
