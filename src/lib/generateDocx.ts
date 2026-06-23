/**
 * DOCX generator for a membership application.
 *
 * SHU-1017 — Membership Application Export & Share (sub-agent B).
 *
 * Consumes the shared `ApplicationView` model and renders a Word document.
 * Pure-JS via the `docx` library so it runs on the Cloudflare Workers runtime
 * (no `node:fs`, no native modules, no Puppeteer).
 *
 * PII safety: this module never logs field values.
 */

import {
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

import { BLANK_MARKER } from './membershipApplicationView'
import type { ApplicationView } from './membershipApplicationView'

/** Organisation name shown on the letterhead. */
const ORG_NAME = 'HIV Connect Central NJ'
/** Brand accent colour (hex without leading '#', per docx convention). */
const BRAND_COLOR = '1B7FB3'

export interface GenerateDocxOptions {
  logo?: Uint8Array | null
}

/** Build the document header: logo image if provided, else org-name text. */
function buildHeader(logo?: Uint8Array | null): Header {
  if (logo) {
    try {
      return new Header({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: logo,
                transformation: { width: 180, height: 60 },
              }),
            ],
          }),
        ],
      })
    } catch {
      // Fall through to the text header on any image-decode failure.
    }
  }

  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: ORG_NAME, bold: true, color: BRAND_COLOR, size: 28 }),
        ],
      }),
    ],
  })
}

/** Render a single field as a "label: value" paragraph (label in bold). */
function fieldParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value || BLANK_MARKER }),
    ],
  })
}

/**
 * Generate a Word (.docx) document for the given application view.
 * Returns the finished document bytes as a `Uint8Array`.
 */
export async function generateApplicationDocx(
  view: ApplicationView,
  opts?: GenerateDocxOptions,
): Promise<Uint8Array> {
  const children: Paragraph[] = []

  // Title + summary block.
  children.push(
    new Paragraph({ text: view.documentTitle, heading: HeadingLevel.HEADING_1 }),
  )
  children.push(fieldParagraph('Applicant', view.applicantName))
  children.push(fieldParagraph('Status', view.statusLabel))
  children.push(fieldParagraph('Submitted', view.submittedAt || BLANK_MARKER))

  // One heading per section, then a paragraph per field.
  for (const section of view.sections) {
    children.push(
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }),
    )
    for (const f of section.fields) {
      children.push(fieldParagraph(f.label, f.value))
    }
  }

  const doc = new Document({
    sections: [
      {
        headers: { default: buildHeader(opts?.logo) },
        children,
      },
    ],
  })

  const buf = await Packer.toBuffer(doc)
  return new Uint8Array(buf)
}
