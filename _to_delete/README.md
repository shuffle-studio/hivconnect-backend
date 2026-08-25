# _to_delete — hivconnect-backend

Staged 2026-08-25.

| File | Why it's here | Confidence |
|---|---|---|
| `comms.ts` | Was `src/lib/comms.ts`, written earlier in this same session. It routed event mail through the shared `shufflestudio-comms` Worker. Superseded by `src/lib/eventNotifications.ts` + `src/lib/email.ts`, which give this project its own Resend sender. Never wired, never deployed. | Safe |

Delete:

    rm -rf _to_delete
