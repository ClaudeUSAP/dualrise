import type { drive_v3, sheets_v4 } from 'googleapis'
import { NextResponse } from 'next/server'
import { getDrive, getSheets } from '@/lib/google'

const UNIVERSITIES_FOLDER_ID = '1jPe6GPMdRI2sFaOu6eEXY1Q0jFvisREj'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

type FoundSheet = {
  id: string
  name: string
  path: string
  tabs: string[]
}

async function walkFolder(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  folderId: string,
  pathPrefix: string
): Promise<FoundSheet[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  const items = res.data.files ?? []

  const subFolderResults = items
    .filter((i) => i.mimeType === FOLDER_MIME && i.id && i.name)
    .map((f) => walkFolder(drive, sheets, f.id!, `${pathPrefix} > ${f.name}`))

  const sheetResults = items
    .filter((i) => i.mimeType === SHEET_MIME && i.id && i.name)
    .map(async (s) => {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: s.id!,
        includeGridData: false,
      })
      const tabs = (meta.data.sheets ?? [])
        .map((sh) => sh.properties?.title)
        .filter((t): t is string => typeof t === 'string')
      return {
        id: s.id!,
        name: s.name!,
        path: pathPrefix,
        tabs,
      }
    })

  const [subs, locals] = await Promise.all([
    Promise.all(subFolderResults),
    Promise.all(sheetResults),
  ])

  return [...subs.flat(), ...locals]
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'disabled in production' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const inspectFileId = searchParams.get('file')

  try {
    if (inspectFileId) {
      const sheets = getSheets()
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: inspectFileId,
        includeGridData: false,
      })
      const tabs = (meta.data.sheets ?? [])
        .map((s) => s.properties?.title)
        .filter((t): t is string => typeof t === 'string')
      const tabName =
        tabs.find((t) => t.toLowerCase().replace(/[\s/]/g, '') === 'maj112025') ??
        tabs[0]
      const valuesRes = await sheets.spreadsheets.values.get({
        spreadsheetId: inspectFileId,
        range: `'${tabName}'!A1:Z5`,
      })
      const values = (valuesRes.data.values ?? []) as string[][]
      return NextResponse.json({
        spreadsheetId: inspectFileId,
        title: meta.data.properties?.title ?? null,
        tabs,
        usedTab: tabName,
        headers: values[0] ?? [],
        sampleRows: values.slice(1, 5),
      })
    }

    const drive = getDrive()
    const sheets = getSheets()

    const rootMeta = await drive.files.get({
      fileId: UNIVERSITIES_FOLDER_ID,
      fields: 'id, name',
      supportsAllDrives: true,
    })
    const rootName = rootMeta.data.name ?? 'root'

    const allSheets = await walkFolder(drive, sheets, UNIVERSITIES_FOLDER_ID, rootName)

    let firstFileSample: {
      name: string
      path: string
      firstTab: string
      headers: string[]
      exampleRow: string[]
    } | null = null

    const first = allSheets[0]
    if (first && first.tabs.length > 0) {
      const firstTab = first.tabs[0]
      const valuesRes = await sheets.spreadsheets.values.get({
        spreadsheetId: first.id,
        range: `${firstTab}!A1:Z2`,
      })
      const rows = (valuesRes.data.values ?? []) as string[][]
      firstFileSample = {
        name: first.name,
        path: first.path,
        firstTab,
        headers: rows[0] ?? [],
        exampleRow: rows[1] ?? [],
      }
    }

    return NextResponse.json({
      rootFolder: rootName,
      filesCount: allSheets.length,
      files: allSheets,
      firstFileSample,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('explore-master-dbs error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
