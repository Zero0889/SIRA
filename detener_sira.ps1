# SIRA - apagado completo de los servicios locales.

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$launcherPath = Join-Path $projectRoot "iniciar_sira.ps1"
$targetPorts = @(3000, 8000)
$targetIds = [System.Collections.Generic.HashSet[int]]::new()

function Agregar-Proceso([int]$processId) {
    if ($processId -gt 0 -and $processId -ne $PID) {
        [void]$targetIds.Add($processId)
    }
}

function Detener-Arbol([int]$processId) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) { return }

    Write-Host " Cerrando $($process.ProcessName) (PID $processId)..." -ForegroundColor Yellow
    & taskkill.exe /F /T /PID $processId *> $null
}

Write-Host ""
Write-Host " Deteniendo servicios SIRA..." -ForegroundColor Cyan
Write-Host ""

# Incluye el lanzador, backend, frontend y puente serial asociados al proyecto.
Get-CimInstance Win32_Process | ForEach-Object {
    $commandLine = [string]$_.CommandLine
    $isLauncher = $commandLine.IndexOf($launcherPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $belongsToProject = $commandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $isSiraService = $commandLine -match "uvicorn|next(.cmd)?\s+start|next\\dist\\bin\\next|serial_bridge\.py"

    if ($isLauncher -or ($belongsToProject -and $isSiraService)) {
        Agregar-Proceso ([int]$_.ProcessId)
    }
}

# Los puertos son la fuente definitiva, incluso si npm o Python cambiaron su cadena de procesos.
foreach ($port in $targetPorts) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Agregar-Proceso ([int]$_.OwningProcess) }
}

foreach ($processId in @($targetIds)) {
    Detener-Arbol $processId
}

Start-Sleep -Milliseconds 700

# Segundo pase para cualquier hijo que haya quedado separado de su proceso padre.
foreach ($port in $targetPorts) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Detener-Arbol ([int]$_.OwningProcess) }
}

$remaining = @(
    foreach ($port in $targetPorts) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    }
)

Write-Host ""
if ($remaining.Count -eq 0) {
    Write-Host " [OK] SIRA se detuvo completamente." -ForegroundColor Green
    exit 0
}

Write-Host " [ERROR] Uno o más servicios siguen activos." -ForegroundColor Red
exit 1
