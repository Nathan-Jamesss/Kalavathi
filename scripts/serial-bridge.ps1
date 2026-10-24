param(
  [Parameter(Mandatory=$true)][string]$Port,
  [string]$Server='http://localhost:8000'
)
$ErrorActionPreference='Stop'
$serial=[System.IO.Ports.SerialPort]::new($Port,115200,[System.IO.Ports.Parity]::None,8,[System.IO.Ports.StopBits]::One)
$serial.NewLine="`n"
$serial.WriteTimeout=1000
try {
  $serial.Open()
  Write-Host "Connected to Uno on $Port. Close Arduino Serial Monitor before using this bridge."
  Start-Sleep -Seconds 2
  while($true){
    $command='R R R R'
    try{
      $command=([string](Invoke-WebRequest -Uri "$Server/api/junctions" -UseBasicParsing -TimeoutSec 2).Content).Trim()
      if($command -notmatch '^[RAG] [RAG] [RAG] [RAG]$'){$command='R R R R'}
    }catch{Write-Warning 'Server unavailable; sending all red.'}
    $serial.WriteLine($command)
    Start-Sleep -Milliseconds 400
  }
}finally{
  if($serial.IsOpen){try{$serial.WriteLine('R R R R')}catch{};$serial.Close()}
  $serial.Dispose()
}
