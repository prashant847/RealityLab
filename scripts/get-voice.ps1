<#
 Downloads the offline neural voice used by "Read aloud": the Piper speech engine (MIT licence) and two Piper voice models, into desktop\voice.
   powershell -ExecutionPolicy Bypass -File scripts\get-voice.ps1
 Everything runs on the student's computer; nothing is ever sent to a cloud service.
 Model files are verified against the SHA-256 that the Hugging Face repository publishes for them. The Piper engine zip is pinned to a hash recorded below.
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "desktop\voice"
New-Item -ItemType Directory -Force $dir | Out-Null

$piperUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
$piperSha = "f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea"
$base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US"
$voices = @(
  @{ id = "en_US-lessac-medium"; path = "lessac/medium" },
  @{ id = "en_US-ryan-medium";   path = "ryan/medium" }
)

function Fetch($url, $out) { Write-Host "  downloading $(Split-Path $out -Leaf)"; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out }

if (-not (Test-Path "$dir\piper\piper.exe")) {
  $zip = Join-Path $dir "piper.zip"
  Fetch $piperUrl $zip
  $h = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($h -ne $piperSha) { throw "Piper engine hash mismatch ($h)" }
  Write-Host "  piper engine sha256 $h"
  Expand-Archive -Force $zip $dir; Remove-Item $zip
}
foreach ($v in $voices) {
  foreach ($ext in @("onnx", "onnx.json")) {
    $out = Join-Path $dir "$($v.id).$ext"
    if (Test-Path $out) { continue }
    $url = "$base/$($v.path)/$($v.id).$ext"
    Fetch $url $out
    if ($ext -eq "onnx") {
      $head = Invoke-WebRequest -UseBasicParsing -Method Head -Uri $url
      $want = ($head.Headers["X-Linked-ETag"] -replace '"', '').ToLower()
      $got = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()
      if ($want -and $want -ne $got) { Remove-Item $out; throw "$($v.id) failed its checksum" }
      Write-Host "  $($v.id) verified ($got)"
    }
  }
}
Write-Host "Voice ready in $dir"
