import React from 'react';

/**
 * Editor guide, rendered above the admin dashboard.
 *
 * This is the SOW deliverable "Documentation: Editor guide, upload
 * instructions, content workflow". It lives in the CMS rather than in a
 * markdown file for two reasons: a file in docs/ is invisible to the person who
 * needs it, and it drifts the moment a field is renamed. Here it sits on the
 * first screen after login, next to the collections it describes.
 *
 * No hooks and no 'use client': native <details> gives collapsible sections
 * with zero JavaScript, so this ships nothing to the browser and stays
 * keyboard accessible for free.
 *
 * Styling uses Payload's own theme variables, so it follows the admin light and
 * dark themes instead of fighting them.
 */

const S = {
  wrap: {
    marginBottom: '2rem',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '4px',
    background: 'var(--theme-elevation-50)',
    overflow: 'hidden',
  },
  head: { padding: '1.25rem 1.5rem 0.75rem' },
  h4: { margin: '0 0 .35rem', fontSize: '1.05rem' },
  sub: { margin: 0, color: 'var(--theme-elevation-600)', fontSize: '.85rem', lineHeight: 1.5 },
  item: { borderTop: '1px solid var(--theme-elevation-150)' },
  summary: {
    cursor: 'pointer',
    padding: '.75rem 1.5rem',
    fontWeight: 600,
    fontSize: '.9rem',
    listStyle: 'revert',
  },
  body: {
    padding: '0 1.5rem 1.1rem 2.6rem',
    fontSize: '.87rem',
    lineHeight: 1.65,
    color: 'var(--theme-elevation-700)',
  },
  ol: { margin: '0 0 .5rem', paddingLeft: '1.1rem' },
  note: {
    marginTop: '.6rem',
    padding: '.55rem .75rem',
    borderLeft: '3px solid var(--theme-elevation-250)',
    background: 'var(--theme-elevation-100)',
    fontSize: '.83rem',
  },
} satisfies Record<string, React.CSSProperties>;

function Task({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details style={S.item}>
      <summary style={S.summary}>{title}</summary>
      <div style={S.body}>{children}</div>
    </details>
  );
}

const EditorGuide: React.FC = () => (
  <div style={S.wrap}>
    <div style={S.head}>
      <h4 style={S.h4}>How do I ...</h4>
      <p style={S.sub}>
        Short answers for the things you do most. Open a section for the steps. Everything
        here matches the fields as they are actually named in this CMS.
      </p>
    </div>

    <Task title="Add or change an event">
      <ol style={S.ol}>
        <li>
          Open <strong>Events</strong> in the sidebar, then <strong>Create New</strong> (or click
          an existing event to edit it).
        </li>
        <li>
          Fill in <strong>Title</strong>, <strong>Description</strong> and{' '}
          <strong>Start Date</strong>. Leave <strong>Slug</strong> alone, it fills itself in from
          the title.
        </li>
        <li>
          Under <strong>Location</strong>, pick In-Person, Virtual or Hybrid. Virtual events want
          a <strong>Virtual Link</strong>; in-person events want an address, and the map pin is
          worked out from it automatically.
        </li>
        <li>
          Choose a <strong>Category</strong>. This is what the filters on the website use, so it
          matters more than it looks.
        </li>
        <li>
          Set <strong>Status</strong> to <strong>Published</strong> in the right-hand sidebar and
          hit Save. Draft events are invisible on the website.
        </li>
      </ol>
      <div style={S.note}>
        Times are entered and displayed in Eastern. If you set 6:00 PM, everyone sees 6:00 PM
        wherever they are.
      </div>
    </Task>

    <Task title="Post a service standard or a bylaw">
      <ol style={S.ol}>
        <li>
          Use <strong>Service Standards</strong> for standards, <strong>Bylaws</strong> for
          governing documents. They are separate on purpose and appear on different pages.
        </li>
        <li>
          <strong>Create New</strong>, give it a <strong>Title</strong>, then upload the file
          under <strong>Document</strong>. PDF and Word both work.
        </li>
        <li>
          Service Standards have a <strong>Category</strong> and an <strong>Order</strong> number
          that controls the order on the page. Bylaws have a <strong>Version</strong> and an{' '}
          <strong>Effective Date</strong>.
        </li>
        <li>
          Set <strong>Status</strong> to Published and Save.
        </li>
      </ol>
      <div style={S.note}>
        Replacing an outdated document: open the existing entry and upload the new file over the
        old one rather than creating a second entry. The old version is kept in history, and any
        links people have already shared keep working.
      </div>
    </Task>

    <Task title="Review a membership application, and send it to someone">
      <ol style={S.ol}>
        <li>
          Open <strong>Membership Applications</strong>. New ones arrive as{' '}
          <strong>Pending Review</strong>.
        </li>
        <li>
          Open an application. In the right-hand sidebar you have{' '}
          <strong>Download PDF</strong>, <strong>Download Word</strong>, and{' '}
          <strong>Create share link</strong>.
        </li>
        <li>
          The share link lets someone read one application without a login. Pick how long it
          should last (1 hour, 24 hours, or 7 days). It stops working by itself when it expires,
          and you can revoke it earlier from the same panel.
        </li>
        <li>
          Move <strong>Status</strong> through Under Review, then Approved or Rejected, so the
          list stays meaningful.
        </li>
      </ol>
      <div style={S.note}>
        Applications contain personal information. Prefer a share link with a short expiry over
        emailing the PDF, since a link can be revoked and an attachment cannot.
      </div>
    </Task>

    <Task title="Update a provider listing">
      <ol style={S.ol}>
        <li>
          Open <strong>Providers</strong> and find the organisation. The search box at the top of
          the list filters by name.
        </li>
        <li>
          <strong>Contact</strong> holds phone, 24-hour phone, email and website.{' '}
          <strong>Hours</strong> is free text per day, so &quot;9:00 AM - 5:00 PM&quot; or
          &quot;Closed&quot; both work.
        </li>
        <li>
          <strong>Services</strong> is grouped into Medical, Support and Prevention. These drive
          the filters on Find Services, so adding a service here makes that provider findable by
          it.
        </li>
        <li>
          <strong>Languages</strong>, <strong>Accessibility</strong> and{' '}
          <strong>Insurance</strong> also feed filters. Worth filling in even when it feels
          repetitive.
        </li>
      </ol>
    </Task>

    <Task title="Add an FAQ">
      <ol style={S.ol}>
        <li>
          Open <strong>FAQs</strong>, then <strong>Create New</strong>.
        </li>
        <li>
          Put the question the way someone would actually ask it in{' '}
          <strong>Question</strong>, and the answer in <strong>Answer</strong>.
        </li>
        <li>
          Pick a <strong>Category</strong>, set <strong>Order</strong> to control where it sits in
          that category, and set <strong>Status</strong> to Published.
        </li>
      </ol>
      <div style={S.note}>
        FAQs are searchable from the website search, so a well-worded question does double duty.
      </div>
    </Task>

    <Task title="Change your password, or add someone to the CMS">
      <ol style={S.ol}>
        <li>
          Your own password: click your name at the bottom of the sidebar, then{' '}
          <strong>Change Password</strong>.
        </li>
        <li>
          A new person: <strong>Users</strong>, then <strong>Create New</strong>. Only Admins can
          do this.
        </li>
        <li>
          <strong>Admin</strong> can manage users and everything else.{' '}
          <strong>Editor</strong> can create and edit content but cannot add or remove people.
          Editor is the right choice for most staff.
        </li>
      </ol>
    </Task>

    <Task title="I saved a change. Why isn't it on the website yet?">
      <p style={{ margin: '0 0 .5rem' }}>
        The public website is rebuilt after every content change rather than reading from the
        CMS on each visit, which is what keeps it fast and keeps it up even if the CMS is down.
      </p>
      <ol style={S.ol}>
        <li>Saving publishes the change here immediately.</li>
        <li>A rebuild starts automatically a few seconds later.</li>
        <li>It usually appears on the public site within a few minutes.</li>
      </ol>
      <div style={S.note}>
        If several edits are saved close together they are batched into one rebuild, which is
        normal. If something still has not appeared after about fifteen minutes, that is worth
        reporting rather than waiting.
      </div>
    </Task>

    <Task title="Something is wrong and I need help">
      <p style={{ margin: 0 }}>
        Email <strong>jose@shuffleseo.com</strong>. It helps to include what you were doing, the
        name of the item you were editing, and a screenshot of anything red on the screen. If the
        website itself is down rather than the CMS, say so, because those are two different
        systems and they fail separately.
      </p>
    </Task>
  </div>
);

export default EditorGuide;
