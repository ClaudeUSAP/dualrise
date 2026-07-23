import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { drive_v3 } from 'googleapis'
import { NextResponse } from 'next/server'
import { getDrive, getSheets } from '@/lib/google'
import {
  deriveLegacyDivision,
  findColumn,
  findMajTab,
  normalizeHeader,
  normalizeSchoolName,
  parseCellBool,
  parseCellInt,
  parseCellInt10,
  parseCellInt5,
  parseFileName,
} from '@/lib/sheet-parser'

const UNIVERSITIES_FOLDER_ID = '1jPe6GPMdRI2sFaOu6eEXY1Q0jFvisREj'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

type Row = Record<string, unknown>

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

async function* walkSpreadsheets(
  drive: drive_v3.Drive,
  folderId: string,
  pathPrefix: string
): AsyncGenerator<{ id: string; name: string; path: string }> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  const items = res.data.files ?? []
  for (const item of items) {
    if (!item.id || !item.name) continue
    if (item.mimeType === FOLDER_MIME) {
      yield* walkSpreadsheets(drive, item.id, `${pathPrefix} > ${item.name}`)
    } else if (item.mimeType === SHEET_MIME) {
      yield { id: item.id, name: item.name, path: pathPrefix }
    }
  }
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'disabled in production' },
      { status: 403 }
    )
  }

  try {
    const drive = getDrive()
    const sheets = getSheets()
    const supabase = getAdminClient()

    const { data: legacyRows, error: legacyErr } = await supabase
      .from('schools')
      .select('id, name')
      .is('master_school_id', null)
    if (legacyErr) throw legacyErr

    const legacyByNorm = new Map<string, { id: string; name: string }>()
    for (const l of legacyRows ?? []) {
      const norm = normalizeSchoolName(l.name)
      if (norm) legacyByNorm.set(norm, l)
    }

    const claimedLegacyIds = new Set<string>()
    const errors: string[] = []
    let filesProcessed = 0
    let filesSkipped = 0
    let schoolsUpserted = 0
    let legacyMatched = 0
    const fileSummary: { name: string; path: string; rows: number }[] = []

    for await (const file of walkSpreadsheets(
      drive,
      UNIVERSITIES_FOLDER_ID,
      'root'
    )) {
      try {
        let meta: ReturnType<typeof parseFileName>
        try {
          meta = parseFileName(file.name)
        } catch {
          errors.push(`Cannot parse filename: ${file.name}`)
          filesSkipped++
          continue
        }

        const sheetMeta = await sheets.spreadsheets.get({
          spreadsheetId: file.id,
          includeGridData: false,
        })
        const tabs = (sheetMeta.data.sheets ?? [])
          .map((s) => s.properties?.title)
          .filter((t): t is string => typeof t === 'string')

        const tabName = findMajTab(tabs)
        if (!tabName) {
          filesSkipped++
          errors.push(`No MAJ112025 tab in: ${file.name}`)
          continue
        }

        const valuesRes = await sheets.spreadsheets.values.get({
          spreadsheetId: file.id,
          range: `'${tabName}'!A1:Z500`,
        })
        const values = (valuesRes.data.values ?? []) as string[][]
        if (values.length < 2) {
          filesSkipped++
          continue
        }

        const headers = values[0]
        const colIdx: Record<string, number> = {}
        headers.forEach((h, idx) => {
          const col = findColumn(normalizeHeader(String(h ?? '')))
          if (col && colIdx[col] == null) colIdx[col] = idx
        })

        const getCell = (row: string[], col: string): string | undefined => {
          const idx = colIdx[col]
          if (idx == null) return undefined
          return row[idx]
        }

        const legacyDiv = deriveLegacyDivision(
          meta.governing_body,
          meta.division_tier
        )
        const rowsToUpsert: Row[] = []

        for (let i = 1; i < values.length; i++) {
          const row = values[i]
          if (!row || row.length === 0) continue

          const masterId = (getCell(row, 'master_school_id') ?? '').trim()
          if (!masterId) continue

          const universityName = (getCell(row, 'name') ?? '').trim()
          if (!universityName) continue

          const norm = normalizeSchoolName(universityName)
          const legacyMatch = norm ? legacyByNorm.get(norm) : undefined
          if (legacyMatch && !claimedLegacyIds.has(legacyMatch.id)) {
            await supabase
              .from('schools')
              .update({ master_school_id: masterId })
              .eq('id', legacyMatch.id)
            claimedLegacyIds.add(legacyMatch.id)
            legacyMatched++
          }

          rowsToUpsert.push({
            master_school_id: masterId,
            name: universityName,
            ranking: parseCellInt(getCell(row, 'ranking')),
            coach_name: (getCell(row, 'coach_name') ?? '').trim() || null,
            coach_email: (getCell(row, 'coach_email') ?? '').trim() || null,
            state_full: (getCell(row, 'state_full') ?? '').trim() || null,
            nearby_city: (getCell(row, 'nearby_city') ?? '').trim() || null,
            distance_to_golf_minutes: parseCellInt(
              getCell(row, 'distance_to_golf_minutes')
            ),
            dorms_quality: parseCellInt10(getCell(row, 'dorms_quality')),
            indoor_facilities: parseCellBool(getCell(row, 'indoor_facilities')),
            practice_courses:
              (getCell(row, 'practice_courses') ?? '').trim() || null,
            coach_mentality:
              (getCell(row, 'coach_mentality') ?? '').trim() || null,
            agent_opinion_coach:
              (getCell(row, 'agent_opinion_coach') ?? '').trim() || null,
            weather_rating: parseCellInt5(getCell(row, 'weather_rating')),
            min_budget_after_aid_usd: parseCellInt(
              getCell(row, 'min_budget_after_aid_usd')
            ),
            religious: (getCell(row, 'religious') ?? '').trim() || null,
            gender: meta.gender,
            governing_body: meta.governing_body,
            division_tier: meta.division_tier,
            division: legacyDiv,
          })
        }

        if (rowsToUpsert.length === 0) {
          filesProcessed++
          fileSummary.push({ name: file.name, path: file.path, rows: 0 })
          continue
        }

        const { error: upsertErr } = await supabase
          .from('schools')
          .upsert(rowsToUpsert, { onConflict: 'master_school_id' })
        if (upsertErr) {
          errors.push(`Upsert failed for ${file.name}: ${upsertErr.message}`)
          continue
        }

        schoolsUpserted += rowsToUpsert.length
        filesProcessed++
        fileSummary.push({
          name: file.name,
          path: file.path,
          rows: rowsToUpsert.length,
        })
        console.log(
          `[sync] ${file.name} (${meta.governing_body}${meta.division_tier ? ' ' + meta.division_tier : ''} ${meta.gender}) → ${rowsToUpsert.length} schools`
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Error processing ${file.name}: ${msg}`)
      }
    }

    return NextResponse.json({
      filesProcessed,
      filesSkipped,
      schoolsUpserted,
      legacyMatched,
      fileSummary,
      errors,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('sync-master-dbs error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
