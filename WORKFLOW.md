# Sersteypan Engineering Workflow (North Star)

## Purpose
Provide a single, shared workflow for all contributors (human and agent). This is the default operating system for planning, building, verifying, and shipping changes.

## Roles and Authority
- Owner (Haukur): final product and business authority, approves scope and shipping decisions.
- Senior Developer (Codex): technical lead, assigns work, enforces quality gates, approves merges.
- Contributors (Claude, Gemini, Jim, others): implement tasks assigned by Senior Developer, follow this workflow.

If instructions conflict, follow this priority: Owner > Senior Developer > this document > other docs.

## Core Principles
- Security first. No cross-tenant data leakage, no auth bypasses, no unsafe defaults.
- Correctness over speed. Fewer bugs beats more features.
- Type safety. Types must match the database and runtime data.
- Small, reviewable changes. Prefer focused fixes over large batches.
- Reproducible builds. CI or local builds must be green before shipping.

## Standard Workflow
1) Clarify scope and success criteria.
2) Identify risks and required checks (security, data integrity, UX).
3) Implement changes in small, testable steps.
4) Run checks and document results.
5) Fix issues and re-run checks.
6) Update status docs and handoff notes.

## Quality Gates (Must Pass)
- TypeScript build passes with strict mode.
- Lint passes or documented exceptions with rationale.
- Security checks for RLS, ownership, and auth.
- No broken pages or critical console errors.
- UX basics: loading, error, empty states.

## Security Checklist (Minimum)
- RLS policies prevent cross-company access.
- Direct URL access to other company data returns 404 or forbidden.
- Server actions validate ownership and auth.
- No service role key usage on the client.
- Storage access limited to authorized users.

## Testing Checklist (Minimum)
- All portal pages load without errors.
- Search and filters work as expected.
- Create flows succeed (priority request, messages, uploads).
- Mobile layout at 375px is usable.
- Icelandic labels and copy are correct.

## Data and Types
- Queries must match actual database nullability.
- Prefer generated Supabase types when possible.
- Never assume non-null without checks or schema constraints.

## Documentation and Handoffs
- Update `STATUS.md` when phases complete.
- Record changes, risks, and remaining issues in a short handoff note.
- If a build fails, document the exact error and file/line.

## Communication Format (For Contributors)
- Start with current task and status.
- List changes made with file paths.
- Report checks run and results.
- Note any risks, blockers, or questions.

## Escalation Rules
- If security is unclear, stop and ask the Senior Developer.
- If requirements conflict, pause and ask the Owner.
- If you find unexpected changes, stop and report immediately.
