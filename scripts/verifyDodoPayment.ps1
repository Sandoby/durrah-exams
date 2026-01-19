# Verify Dodo Payment/Subscription via Convex

$uri = 'https://usable-shepherd-176.convex.site/verifyDodoPayment'
$bodyObj = @{
  orderId = 'sub_0NWdZIAAbNuVtRCmGQ3Hh'
}
$body = $bodyObj | ConvertTo-Json -Depth 5
try {
  $response = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body $body
  $response | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  } elseif ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $content = $reader.ReadToEnd()
    Write-Output $content
  }
  exit 1
}