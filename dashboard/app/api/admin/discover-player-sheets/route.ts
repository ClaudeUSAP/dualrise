import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { drive_v3 } from 'googleapis'
import { NextResponse } from 'next/server'
import { getDrive } from '@/lib/google'

const CLIENTS_FOLDER_ID = '1FB5icDo-CTbDcAoxLDN2p-kpInF2_4sT'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
const MAX_DEPTH = 5

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function checkAuth(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesPlayer(text: string, firstName: string, lastName: string): boolean {
  const norm = ` ${normalizeText(text)} `
  const fn = normalizeText(firstName)
  const ln = normalizeText(lastName)
  if (!fn || !ln) return false
  return norm.includes(` ${fn} `) && norm.includes(` ${ln} `)
}

type SheetMatch = {
  sheetId: string
  sheetName: string
  path: string[]
  immediateParentName: string
  immediateParentId: string
}

async function walkForListeFacs(
  drive: drive_v3.Drive,
  folderId: string,
  path: string[],
  depth: number,
  results: SheetMatch[]
): Promise<void> {
  if (depth > MAX_DEPTH) return
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  const items = res.data.files ?? []

  await Promise.all(
    items.map(async (item) => {
      if (!item.id || !item.name) return
      if (item.mimeType === FOLDER_MIME) {
        await walkForListeFacs(drive, item.id, [...path, item.name], depth + 1, results)
      } else if (item.mimeType === SHEET_MIME) {
        const lower = item.name.toLowerCase()
        if (lower.includes('liste') && lower.includes('fac')) {
          results.push({
            sheetId: item.id,
            sheetName: item.name,
            path: [...path],
            immediateParentName: path[path.length - 1] ?? '',
            immediateParentId: folderId,
          })
        }
      }
    })
  )
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const debug = searchParams.get('debug') === 'true'

  try {
    const drive = getDrive()
    const supabase = getAdminClient()

    if (debug) {
      const subRes = await drive.files.list({
        q: `'${CLIENTS_FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 50,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })
      const folderDumps = await Promise.all(
        (subRes.data.files ?? []).map(async (sub) => {
          const r = await drive.files.list({
            q: `'${sub.id}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 50,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          })
          return { folderName: sub.name, folderId: sub.id, children: r.data.files ?? [] }
        })
      )
      return NextResponse.json({ folderDumps })
    }

    const sheetsFound: SheetMatch[] = []
    await walkForListeFacs(drive, CLIENTS_FOLDER_ID, [], 0, sheetsFound)

    const { data: players, error: playersErr } = await supabase
      .from('players')
      .select('id, first_name, last_name, sheet_id, sheet_folder_id')
    if (playersErr) throw playersErr
    const allPlayers = players ?? []

    const discovered: Array<{
      player_id: string
      player_name: string
      sheet_id: string
      sheet_name: string
      folder_id: string
      folder_name: string
      path: string[]
      match_source: 'sheet' | 'parent_folder'
    }> = []
    const unmatchedSheets: Array<{
      sheet_id: string
      sheet_name: string
      path: string[]
    }> = []
    const matchedPlayerIds = new Set<string>()

    for (const sheet of sheetsFound) {
      let matched: (typeof allPlayers)[0] | null = null
      let source: 'sheet' | 'parent_folder' = 'sheet'

      for (const p of allPlayers) {
        if (matchesPlayer(sheet.sheetName, p.first_name, p.last_name)) {
          matched = p
          source = 'sheet'
          break
        }
      }
      if (!matched) {
        for (const p of allPlayers) {
          if (matchesPlayer(sheet.immediateParentName, p.first_name, p.last_name)) {
            matched = p
            source = 'parent_folder'
            break
          }
        }
      }

      if (matched) {
        matchedPlayerIds.add(matched.id)
        await supabase
          .from('players')
          .update({
            sheet_id: sheet.sheetId,
            sheet_folder_id: sheet.immediateParentId,
          })
          .eq('id', matched.id)
        discovered.push({
          player_id: matched.id,
          player_name: `${matched.first_name} ${matched.last_name}`,
          sheet_id: sheet.sheetId,
          sheet_name: sheet.sheetName,
          folder_id: sheet.immediateParentId,
          folder_name: sheet.immediateParentName,
          path: sheet.path,
          match_source: source,
        })
      } else {
        unmatchedSheets.push({
          sheet_id: sheet.sheetId,
          sheet_name: sheet.sheetName,
          path: sheet.path,
        })
      }
    }

    const unmatchedPlayers = allPlayers
      .filter((p) => !matchedPlayerIds.has(p.id))
      .map((p) => ({
        player_id: p.id,
        player_name: `${p.first_name} ${p.last_name}`,
        had_sheet_before: !!p.sheet_id,
      }))

    return NextResponse.json({
      sheetsFound: sheetsFound.length,
      discovered,
      unmatched_sheets: unmatchedSheets,
      unmatched_players: unmatchedPlayers,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('discover-player-sheets error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
