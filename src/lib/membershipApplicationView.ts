/**
 * Shared "render" model for a membership application.
 *
 * SHU-1017 — Membership Application Export & Share.
 *
 * `buildApplicationView(doc)` turns a raw `membership-applications` document
 * into an ordered list of labeled sections. Both the PDF and DOCX generators
 * consume this single representation so the layout (section order, labels,
 * blank-field handling) stays consistent and is maintained in one place.
 *
 * PII safety: this module only *shapes* data. It never logs field values.
 */

/** A single labeled value within a section. */
export interface ApplicationViewField {
  label: string
  /** Human-readable value. Empty/optional fields are rendered as a marker. */
  value: string
  /** True when the applicant left this field blank/optional and unanswered. */
  isBlank: boolean
}

/** A titled group of fields. */
export interface ApplicationViewSection {
  title: string
  fields: ApplicationViewField[]
}

/** The complete ordered view consumed by the document generators. */
export interface ApplicationView {
  /** e.g. "Application #42" — safe, non-PII title for the document. */
  documentTitle: string
  /** Applicant display name, used in filenames and headings. */
  applicantName: string
  /** Current status label (e.g. "Pending Review"). */
  statusLabel: string
  /** ISO submission timestamp, if available. */
  submittedAt?: string
  sections: ApplicationViewSection[]
}

/** Marker shown for an optional field the applicant left blank. */
export const BLANK_MARKER = '— Not provided —'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  reviewing: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

/** Coerce any value to a trimmed string, treating null/undefined as empty. */
function toStr(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).trim()
}

/**
 * Flatten a Payload array field (e.g. `languages: [{ language: 'English' }]`)
 * into a comma-separated string using the given inner key.
 */
function arrayToStr(value: unknown, key: string): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => {
      if (item && typeof item === 'object') return toStr((item as Record<string, unknown>)[key])
      return toStr(item)
    })
    .filter(Boolean)
    .join(', ')
}

/** Build one field entry, flagging blank optional values. */
function field(label: string, raw: string): ApplicationViewField {
  const value = raw.trim()
  if (value === '') {
    return { label, value: BLANK_MARKER, isBlank: true }
  }
  return { label, value, isBlank: false }
}

/** Join address parts into a single readable line. */
function joinParts(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(', ')
}

/**
 * Build the ordered, labeled view from a membership application document.
 * Accepts the raw doc shape (loose typing so it works before payload-types
 * regen). Handles blank/optional fields gracefully.
 */
export function buildApplicationView(doc: Record<string, any>): ApplicationView {
  const d = doc || {}

  const firstName = toStr(d.firstName)
  const lastName = toStr(d.lastName)
  const applicantName = joinParts([firstName, lastName].filter(Boolean)).replace(/, /g, ' ') ||
    toStr(d.fullName) ||
    'Applicant'

  const statusLabel = STATUS_LABELS[toStr(d.status)] || toStr(d.status) || 'Pending Review'

  const dob = joinParts([toStr(d.birthMonth), toStr(d.birthDay), toStr(d.birthYear)])

  const homeAddress = joinParts([
    toStr(d.streetAddress),
    toStr(d.addressLine2),
    toStr(d.city),
    toStr(d.state),
    toStr(d.zipCode),
    toStr(d.country),
  ])

  const companyAddress = joinParts([
    toStr(d.companyAddress),
    toStr(d.companyAddressLine2),
    toStr(d.companyCity),
    toStr(d.companyState),
    toStr(d.companyZipCode),
  ])

  const sections: ApplicationViewSection[] = [
    {
      title: 'Status',
      fields: [
        field('Application Status', statusLabel),
        field('Submitted', toStr(d.createdAt)),
        field('Last Updated', toStr(d.updatedAt)),
      ],
    },
    {
      title: 'Personal Information',
      fields: [
        field('First Name', firstName),
        field('Last Name', lastName),
        field('Date of Birth (M / D / Y)', dob),
        field('Gender', toStr(d.gender)),
        field('Age', toStr(d.age)),
        field('Race / Ethnicity', toStr(d.raceEthnicity)),
      ],
    },
    {
      title: 'Contact',
      fields: [
        field('Email', toStr(d.email)),
        field('Primary Phone', toStr(d.phone)),
        field('Home Phone', toStr(d.homePhone)),
        field('Cell Phone', toStr(d.cellPhone)),
        field('Best Time to Call', toStr(d.bestTimeToCall)),
        field('Home Address', homeAddress),
      ],
    },
    {
      title: 'Employment',
      fields: [
        field('Currently Employed', toStr(d.isEmployed)),
        field('Employer(s)', toStr(d.employers)),
        field('Job Title', toStr(d.jobTitle)),
        field('Company Address', companyAddress),
      ],
    },
    {
      title: 'Demographics',
      fields: [
        field('Received Ryan White Services', toStr(d.receivedRyanWhiteServices)),
        field('Languages', arrayToStr(d.languages, 'language')),
        field('Mailing Lists', arrayToStr(d.mailingLists, 'list')),
        field('Service Providers', arrayToStr(d.serviceProviders, 'provider')),
        field('Needs Assistance', toStr(d.needsAssistance)),
        field('Assistance Description', toStr(d.assistanceDescription)),
      ],
    },
    {
      title: 'Experience',
      fields: [
        field('Why do you want to join?', toStr(d.whyJoin)),
        field('HIV/AIDS Experience', toStr(d.hivExperience)),
        field('Background / Experience', toStr(d.backgroundExperience)),
        field('Diverse Experience', arrayToStr(d.diverseExperience, 'experience')),
        field('Eligibility Info', toStr(d.eligibilityInfo)),
        field('Membership Categories', arrayToStr(d.membershipCategories, 'category')),
        field('Experience Interests', arrayToStr(d.experienceInterests, 'interest')),
      ],
    },
    {
      title: 'Commitment',
      fields: [
        field('Agreed to Commitments', toStr(d.agreedToCommitments)),
        field('Consent Given', toStr(d.consentGiven)),
      ],
    },
    {
      title: 'Admin Notes',
      fields: [field('Internal Notes', toStr(d.adminNotes))],
    },
  ]

  const idStr = toStr(d.id)

  return {
    documentTitle: idStr ? `Membership Application #${idStr}` : 'Membership Application',
    applicantName,
    statusLabel,
    submittedAt: toStr(d.createdAt) || undefined,
    sections,
  }
}
