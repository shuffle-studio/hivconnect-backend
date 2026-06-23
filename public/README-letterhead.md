# Letterhead / logo asset (SHU-1017)

The PDF and DOCX exports embed an optional letterhead logo from:

    public/letterhead-logo.png

**This PNG is intentionally NOT committed yet** — drop the real HIV Connect logo
here (PNG, ideally ~600px wide, transparent or white background) before the
design pass. Match the website brand specs.

If `letterhead-logo.png` is absent, the generators fall back to a text-only
letterhead ("HIV Connect Central NJ" in the brand color), so the build and
exports still work. Adding the PNG is a non-blocking enhancement.

Brand accent color used by the text fallback: `#1B7FB3`.
