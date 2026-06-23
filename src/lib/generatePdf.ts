/**
 * PDF generator for a membership application.
 *
 * SHU-1017 — Membership Application Export & Share.
 *
 * Renders an `ApplicationView` (see `membershipApplicationView.ts`) into a
 * letterhead PDF using `pdf-lib`. Pure-JS and Cloudflare Workers safe: no
 * `node:fs`, no Puppeteer, no native modules.
 *
 * PII safety: this module never logs field values.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { ApplicationView } from './membershipApplicationView'
import { BLANK_MARKER } from './membershipApplicationView'

export interface GeneratePdfOptions {
  logo?: Uint8Array | null
}

const ORG_NAME = 'HIV Connect Central NJ'

/** Brand accent color #1B7FB3 as a pdf-lib RGB value. */
const BRAND_COLOR: RGB = rgb(0x1b / 255, 0x7f / 255, 0xb3 / 255)
const TEXT_COLOR: RGB = rgb(0.1, 0.1, 0.1)
const MUTED_COLOR: RGB = rgb(0.4, 0.4, 0.4)

const PAGE_WIDTH = 612 // US Letter, points
const PAGE_HEIGHT = 792
const MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const BODY_SIZE = 11
const LABEL_SIZE = 11
const SECTION_SIZE = 14
const HEADER_TITLE_SIZE = 18
const LETTERHEAD_SIZE = 20
const LINE_GAP = 4

/** Internal cursor describing the current draw position and active page. */
interface Cursor {
  page: PDFPage
  y: number
}

/**
 * Split a string into lines that fit within `maxWidth` at the given font size.
 * Falls back to hard-breaking individual words that are themselves too long.
 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split(/\r?\n/)

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const candidate = current === '' ? word : `${current} ${word}`
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
        continue
      }

      if (current !== '') {
        lines.push(current)
        current = ''
      }

      // The word alone may still overflow; hard-break it character by character.
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word
      } else {
        let chunk = ''
        for (const char of word) {
          const next = chunk + char
          if (font.widthOfTextAtSize(next, size) <= maxWidth) {
            chunk = next
          } else {
            if (chunk !== '') lines.push(chunk)
            chunk = char
          }
        }
        current = chunk
      }
    }

    if (current !== '') lines.push(current)
  }

  return lines
}

/** Add a fresh page and reset the cursor to the top content margin. */
function addPage(doc: PDFDocument): Cursor {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  return { page, y: PAGE_HEIGHT - MARGIN }
}

/** Ensure at least `needed` vertical points remain; otherwise start a new page. */
function ensureSpace(doc: PDFDocument, cursor: Cursor, needed: number): void {
  if (cursor.y - needed < MARGIN) {
    const next = addPage(doc)
    cursor.page = next.page
    cursor.y = next.y
  }
}

/**
 * Draw a block of text (already wrapped per-line), paginating as needed.
 * Advances the cursor below the drawn block.
 */
function drawLines(
  doc: PDFDocument,
  cursor: Cursor,
  lines: string[],
  font: PDFFont,
  size: number,
  x: number,
  color: RGB,
): void {
  const lineHeight = size + LINE_GAP
  for (const line of lines) {
    ensureSpace(doc, cursor, lineHeight)
    cursor.y -= size
    cursor.page.drawText(line, { x, y: cursor.y, size, font, color })
    cursor.y -= LINE_GAP
  }
}

/** Format an ISO timestamp into a readable date, falling back to the raw value. */
function formatDate(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generate a letterhead PDF for a membership application view.
 * Returns the finished PDF bytes.
 */
export async function generateApplicationPdf(
  view: ApplicationView,
  opts?: GeneratePdfOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const cursor = addPage(doc)

  // --- Letterhead ---------------------------------------------------------
  let drewImageLetterhead = false
  if (opts?.logo) {
    try {
      const image = await doc.embedPng(opts.logo)
      const maxLogoWidth = CONTENT_WIDTH
      const maxLogoHeight = 80
      const scale = Math.min(maxLogoWidth / image.width, maxLogoHeight / image.height, 1)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      cursor.y -= drawHeight
      cursor.page.drawImage(image, {
        x: MARGIN,
        y: cursor.y,
        width: drawWidth,
        height: drawHeight,
      })
      cursor.y -= 16
      drewImageLetterhead = true
    } catch {
      // Embedding failed (corrupt/non-PNG bytes) — fall back to text letterhead.
      drewImageLetterhead = false
    }
  }

  if (!drewImageLetterhead) {
    cursor.y -= LETTERHEAD_SIZE
    cursor.page.drawText(ORG_NAME, {
      x: MARGIN,
      y: cursor.y,
      size: LETTERHEAD_SIZE,
      font: fontBold,
      color: BRAND_COLOR,
    })
    cursor.y -= 18
  }

  // Accent rule under the letterhead.
  ensureSpace(doc, cursor, 12)
  cursor.y -= 8
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: PAGE_WIDTH - MARGIN, y: cursor.y },
    thickness: 2,
    color: BRAND_COLOR,
  })
  cursor.y -= 20

  // --- Header block -------------------------------------------------------
  drawLines(doc, cursor, [view.documentTitle], fontBold, HEADER_TITLE_SIZE, MARGIN, TEXT_COLOR)
  cursor.y -= 4

  const headerMeta: string[] = [
    `Applicant: ${view.applicantName}`,
    `Status: ${view.statusLabel}`,
  ]
  const submitted = formatDate(view.submittedAt)
  if (submitted) headerMeta.push(`Submitted: ${submitted}`)

  for (const meta of headerMeta) {
    const wrapped = wrapText(meta, font, BODY_SIZE, CONTENT_WIDTH)
    drawLines(doc, cursor, wrapped, font, BODY_SIZE, MARGIN, MUTED_COLOR)
  }
  cursor.y -= 12

  // --- Sections -----------------------------------------------------------
  for (const section of view.sections) {
    // Keep the section heading with at least one following line.
    ensureSpace(doc, cursor, SECTION_SIZE + BODY_SIZE + LINE_GAP * 3)
    cursor.y -= 8
    drawLines(doc, cursor, [section.title], fontBold, SECTION_SIZE, MARGIN, BRAND_COLOR)
    cursor.y -= 4

    for (const fieldEntry of section.fields) {
      const value = fieldEntry.isBlank ? BLANK_MARKER : fieldEntry.value
      const line = `${fieldEntry.label}: ${value}`
      const wrapped = wrapText(line, font, BODY_SIZE, CONTENT_WIDTH)
      drawLines(doc, cursor, wrapped, font, LABEL_SIZE, MARGIN, TEXT_COLOR)
    }
    cursor.y -= 6
  }

  return await doc.save()
}
