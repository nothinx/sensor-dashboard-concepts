// Infrastruktur Azure proyek 14 (Uji Akhir Lini Kulkas). CONTOH; belum pernah dijalankan.
// Deploy ke langganan milik klien: lihat docs/CLOUD.md dan infra/deploy.sh.
// Sebelum deploy, verifikasi versi API & nama properti terhadap dokumentasi Azure terbaru:
// [REAL DATA: verifikasi versi API resource saat deploy]

@description('Awalan nama resource, huruf kecil tanpa spasi')
param nama string = 'polyuji'
param lokasi string = resourceGroup().location

var dbNama = 'ujiakhir'

// ---------- Cosmos DB (NoSQL, serverless, autentikasi lokal dimatikan: hanya Entra ID) ----------
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: '${nama}-cosmos'
  location: lokasi
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [ { locationName: lokasi, failoverPriority: 0 } ]
    capabilities: [ { name: 'EnableServerless' } ]
    disableLocalAuth: true
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
  }
}

resource db 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: dbNama
  properties: { resource: { id: dbNama } }
}

var containers = [
  { id: 'pengujian', pk: '/lini', ttl: 7776000 }
  { id: 'alarm', pk: '/lini', ttl: 2592000 }
  { id: 'leases', pk: '/id', ttl: -1 }
]

resource ctr 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [for c in containers: {
  parent: db
  name: c.id
  properties: {
    resource: {
      id: c.id
      partitionKey: { paths: [ c.pk ], kind: 'Hash' }
      defaultTtl: c.ttl
    }
  }
}]

// ---------- Key Vault: rahasia yang tak bisa memakai managed identity (mis. string koneksi perangkat) ----------
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${nama}-kv'
  location: lokasi
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

// ---------- Function App (change feed) dengan managed identity ----------
resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${nama}fnstore'
  location: lokasi
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${nama}-plan'
  location: lokasi
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: true }
}

resource fn 'Microsoft.Web/sites@2023-12-01' = {
  name: '${nama}-fungsi'
  location: lokasi
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Python|3.11'
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'python' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${st.name};AccountKey=${st.listKeys().keys[0].value}' }
        // trigger Cosmos memakai identitas terkelola (koneksi berbasis identitas, tanpa kunci)
        { name: 'CosmosDb__accountEndpoint', value: cosmos.properties.documentEndpoint }
      ]
    }
  }
}

// Peran data bawaan Cosmos DB "Built-in Data Contributor" untuk identitas Function App
resource peranFn 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, fn.id, 'data-contributor')
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: fn.identity.principalId
    scope: cosmos.id
  }
}

// ---------- IoT Hub: pesan stasiun uji dirutekan ke container `pengujian` ----------
// Rute IoT Hub ke endpoint Cosmos DB dikonfigurasi setelah hub dibuat (lihat deploy.sh), karena
// skema properti endpoint Cosmos DB berbeda antar versi API. [REAL DATA: verifikasi saat deploy]
resource hub 'Microsoft.Devices/IotHubs@2023-06-30' = {
  name: '${nama}-hub'
  location: lokasi
  sku: { name: 'S1', capacity: 1 }
  identity: { type: 'SystemAssigned' }
  properties: { minTlsVersion: '1.2', disableLocalAuth: false }
}

output cosmosEndpoint string = cosmos.properties.documentEndpoint
output functionApp string = fn.name
output iotHub string = hub.name
output keyVault string = kv.name
