import type { ProfileInput } from "./resume-schemas";

function withoutContactDetails(profile: ProfileInput): ProfileInput {
  return {
    personal: {
      fullName: "",
      title: profile.personal.title,
      email: "",
      phone: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: profile.personal.summary,
    },
    skills: profile.skills,
    experience: profile.experience,
    education: profile.education,
  };
}

/** Identity is restored from the verified source after generation, never requested from AI. */
export const buildResumeGenerationPayload = withoutContactDetails;

/** Matching operations need career evidence, not identity or contact details. */
export const buildAtsPayload = withoutContactDetails;
export const buildSkillGapPayload = withoutContactDetails;
export const buildInterviewPayload = withoutContactDetails;
export const buildLinkedInPayload = withoutContactDetails;

/** A cover letter needs the sender's name, but not phone, social links, or portfolio URL. */
export function buildCoverLetterPayload(profile: ProfileInput): ProfileInput {
  const minimal = withoutContactDetails(profile);
  return {
    ...minimal,
    personal: { ...minimal.personal, fullName: profile.personal.fullName },
  };
}