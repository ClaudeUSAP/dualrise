import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
]

function getAuth() {
  const b64 = process.env.GOOGLE_SA_JSON_B64
  if (!b64) throw new Error('GOOGLE_SA_JSON_B64 not set')
  const credentials = JSON.parse(Buffer.from(b64, 'base64').toString())
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES })
}

export function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() })
}


export type FindSheetResult = {
  found: boolean
  fileId: string | null
  fileName: string | null
  candidates: { id: string; name: string }[]
}

export async function findPlayerSheet(
  firstName: string,
  lastName: string
): Promise<FindSheetResult> {
  const drive = getDrive()
  const escapedFirst = firstName.replace(/'/g, "\\'")
  const escapedLast = lastName.replace(/'/g, "\\'")
  const query = [
    `name contains '${escapedFirst}'`,
    `name contains '${escapedLast}'`,
    `name contains 'Liste Facs'`,
    `mimeType = 'application/vnd.google-apps.spreadsheet'`,
    `trashed = false`,
  ].join(' and ')
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  const files = res.data.files ?? []
  const candidates = files.map((f) => ({ id: f.id ?? '', name: f.name ?? '' }))
  if (files.length === 1) {
    return {
      found: true,
      fileId: files[0].id ?? null,
      fileName: files[0].name ?? null,
      candidates,
    }
  }
  return {
    found: false,
    fileId: null,
    fileName: null,
    candidates,
  }
}

