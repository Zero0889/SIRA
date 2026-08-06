# =====================================================
#   SIRA - Sistema Inteligente de Riego Agricola
#   Lanzador de UNA sola ventana:
#     - Backend  (uvicorn :8000)  -> oculto, log en backend.log
#     - Frontend (next    :3000)  -> oculto, log en frontend.log
#     - Bridge   (COM2 -> backend) -> en ESTA ventana cuando esta disponible
#   Ctrl+C detiene TODO.
# =====================================================

param(
    [string]$Com     = "COM2",
    [string]$Device  = "ESP32-001",
    [int]   $PortBE  = 8000,
    [int]   $PortFE  = 3000
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root      = $PSScriptRoot
$backend   = Join-Path $root "backend"
$frontend  = Join-Path $root "frontend"
$simulator = Join-Path $root "simulator"
$venv      = Join-Path $backend ".venv\Scripts"
$py        = Join-Path $venv "python.exe"
$uvicorn   = Join-Path $venv "uvicorn.exe"

function Escribe($msg, $color = "Gray") { Write-Host " $msg" -ForegroundColor $color }

Write-Host ""
Write-Host " =====================================================" -ForegroundColor Green
Write-Host "   SIRA - Sistema Inteligente de Riego Agricola"       -ForegroundColor Green
Write-Host " =====================================================" -ForegroundColor Green
Write-Host ""

# --- Verificar entorno virtual ---
if (-not (Test-Path $uvicorn)) {
    Escribe "[ERROR] No se encontro el entorno virtual en backend\.venv" "Red"
    Escribe "Crealo con:  cd backend; python -m venv .venv; .venv\Scripts\pip install -r requirements.txt" "Yellow"
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Libera un puerto TCP matando el proceso que lo tenga ocupado (evita zombies
# de arranques anteriores que dejan servir un build viejo -> pagina sin estilos).
function Liberar-Puerto($puerto) {
    $lineas = netstat -ano | Select-String ":$puerto\s" | Select-String "LISTENING"
    foreach ($l in $lineas) {
        $procId = ($l.ToString() -split '\s+')[-1]
        if ($procId -match '^\d+$' -and $procId -ne '0') {
            taskkill /F /PID $procId *> $null
            Escribe "[INFO] Liberado puerto $puerto (proceso viejo PID $procId detenido)." "Yellow"
        }
    }
}

# Procesos hijos que habra que cerrar al final
$hijos = @()

function Detener-Todo {
    Write-Host ""
    Escribe "[INFO] Cerrando todos los servicios..." "Yellow"
    foreach ($p in $hijos) {
        if ($p -and -not $p.HasExited) {
            # /T mata tambien los procesos hijos (npm -> node)
            taskkill /F /T /PID $p.Id *> $null
        }
    }
    Escribe "[OK] Todos los servicios detenidos." "Green"
}

try {
    # ============================
    # 0. Liberar puertos de arranques previos
    # ============================
    Liberar-Puerto $PortBE
    Liberar-Puerto $PortFE

    # ============================
    # 1. BACKEND (oculto)
    # ============================
    Escribe "[1/3] Iniciando Backend (puerto $PortBE)..." "Cyan"
    $be = Start-Process -FilePath $uvicorn `
        -ArgumentList "app.main:app", "--host", "127.0.0.1", "--port", "$PortBE" `
        -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $root "backend.log") `
        -RedirectStandardError  (Join-Path $root "backend.err.log")
    $hijos += $be

    # Esperar a que responda (max ~20s)
    Escribe "[INFO] Esperando a que el backend arranque..." "Gray"
    $ok = $false
    foreach ($i in 1..20) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest "http://127.0.0.1:$PortBE/docs" -TimeoutSec 2 -UseBasicParsing *> $null
            $ok = $true; break
        } catch { }
    }
    if ($ok) { Escribe "[OK] Backend listo en http://localhost:$PortBE" "Green" }
    else     { Escribe "[AVISO] El backend tarda en responder. Continuando..." "Yellow" }

    # ============================
    # 2. FRONTEND (oculto)
    # ============================
    $buildId = Join-Path $frontend ".next\BUILD_ID"
    if (-not (Test-Path $buildId)) {
        Escribe "[INFO] Preparando la interfaz por primera vez. Esto puede tardar un minuto..." "Yellow"
        Push-Location $frontend
        try {
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) {
                throw "No se pudo construir la interfaz de SIRA."
            }
        }
        finally {
            Pop-Location
        }
        Escribe "[OK] Interfaz preparada correctamente." "Green"
    }

    Escribe "[2/3] Iniciando Frontend (puerto $PortFE)..." "Cyan"
    $fe = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm", "start" `
        -WorkingDirectory $frontend -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $root "frontend.log") `
        -RedirectStandardError  (Join-Path $root "frontend.err.log")
    $hijos += $fe

    Escribe "[INFO] Esperando a que la interfaz arranque..." "Gray"
    $frontendOk = $false
    foreach ($i in 1..30) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest "http://127.0.0.1:$PortFE" -TimeoutSec 2 -UseBasicParsing *> $null
            $frontendOk = $true; break
        } catch { }
    }
    if (-not $frontendOk) {
        $frontendErrorLog = Join-Path $root "frontend.err.log"
        $detalle = if (Test-Path $frontendErrorLog) {
            (Get-Content $frontendErrorLog -Tail 8 -ErrorAction SilentlyContinue) -join " "
        } else {
            "Revisa que Node.js y npm esten instalados."
        }
        throw "La interfaz no respondio en el puerto $PortFE. $detalle"
    }
    Escribe "[OK] Interfaz lista en http://localhost:$PortFE" "Green"

    # ============================
    # 3. BRIDGE SERIAL (esta ventana)
    # ============================
    Escribe "[3/3] Iniciando Bridge Serial ($Com -> Backend)..." "Cyan"
    Write-Host ""
    Write-Host " =====================================================" -ForegroundColor Green
    Write-Host "  Backend:   http://localhost:$PortBE/docs  (oculto)"
    Write-Host "  Frontend:  http://localhost:$PortFE       (oculto)"
    Write-Host "  Bridge:    Proteus COM1 --> Python $Com --> Backend"
    Write-Host "  Logs:      backend.log / frontend.log"
    Write-Host " =====================================================" -ForegroundColor Green
    Write-Host ""
    Escribe "Esta consola muestra las lecturas en vivo. Ctrl+C para detener TODO." "Gray"
    Write-Host ""

    Start-Process "http://localhost:$PortFE"   # abrir navegador

    # El bridge bloquea esta ventana mientras esta conectado. Si no existe el
    # puerto seleccionado, la web y la API siguen disponibles para uso manual.
    try {
        & $py -u (Join-Path $simulator "serial_bridge.py") --port $Com --device $Device
        $bridgeExitCode = $LASTEXITCODE
    }
    catch {
        $bridgeExitCode = 1
        Escribe "[AVISO] No se pudo iniciar el puente serial: $($_.Exception.Message)" "Yellow"
    }

    if ($bridgeExitCode -ne 0) {
        Write-Host ""
        Escribe "[AVISO] No se encontro $Com. SIRA seguira funcionando sin Arduino/Proteus." "Yellow"
        Escribe "Abre http://localhost:$PortFE y usa Ctrl+C para detener los servicios." "Gray"
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
}
finally {
    Detener-Todo
    Read-Host "Presiona Enter para cerrar"
}
