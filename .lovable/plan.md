# Updateable job-skill learning plans

## Goal
Turn identified job-skill gaps into a saved, account-specific learning plan with milestones. Completed work remains progress evidence until the user reviews and chooses whether to add it to their resume profile.

## Build
- Add private, user-owned storage for learning plans and milestones, protected so each account can only access its own records.
- Create a learning-plan panel from the existing job-skill analysis, with practical milestones for fundamentals, guided practice, and a demonstrable project.
- Let users update milestone status, add evidence notes, and see skill-level progress.
- When training or project milestones are completed, show a review action that previews the truthful profile label or project evidence before anything is added.
- Reuse the existing profile save flow after explicit approval; never convert learning, training, or projects into professional experience.
- Keep existing AI limits and billing behavior unchanged. Milestone updates use no AI request or resume credit.

## Verification
- Test ownership isolation, milestone updates, persistence, and the review-before-profile-update flow.
- Confirm learning/training labels remain truthful in resume preview and export.
- Run focused tests, check the preview build, and exercise the signed-in flow without making paid AI requests.

## Technical details
- Persist normalized learning plans and milestone rows in Lovable Cloud with authenticated-only grants and owner-scoped access policies.
- Add authenticated server functions for listing, saving, updating, and deleting owned plans.
- Derive initial milestones deterministically from existing gap results so plan creation does not add a new AI path.
- Record approved evidence through the existing profile model and encrypted profile save function.