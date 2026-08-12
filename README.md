# Resume Rocket

Act as a Senior Full-Stack Developer. Build a production-ready, ATS-Friendly Resume Builder web application using React (Vite), Tailwind CSS, Node.js (Express), and Google Gemini API (or OpenAI API).

### 1. Application Overview
A single-page or tabbed web application that takes user profile details and a target Job Description (JD), then leverages an AI model to generate a tailored, ATS-optimized resume (targeting a 90+ ATS match score). Users can preview and download the output directly as a clean PDF.

---

### 2. Core Features & Workflow
1. **Profile Data Input Form:**
   - **Personal Info:** Full Name, Professional Title, Email, Phone Number, LinkedIn URL, GitHub URL, Portfolio/Website.
   - **Skills:** Categorized list (e.g., Technical Skills, Frameworks, Tools, Soft Skills).
   - **Experience / Projects:** Title, Company/Project Name, Date Range, Key Responsibilities/Achievements (bullet points).
   - **Education:** Degree, Major, Institution, Graduation Year, Score/CGPA.
2. **Job Description (JD) Input:**
   - A dedicated text area for pasting the target Job Description.
3. **AI Generation & ATS Optimizer:**
   - On clicking "Generate Resume", send profile data and JD to the backend.
   - Prompt the LLM to rewrite summary/experience bullet points to naturally integrate missing keywords from the JD without lying or stuffing.
   - Calculate and return an estimated **ATS Match Score (%)** and key matching breakdown.
4. **Interactive Preview & Customization:**
   - Real-time preview of the clean, single-column or standard 2-column ATS-formatted resume.
   - Clean, ATS-friendly layout: standard sans-serif fonts (Arial/Inter), clear headings, no heavy graphic bars/icons.
5. **PDF Export:**
   - Download the generated resume as a styled PDF (using `react-to-print`, `html2pdf.js`, or `@react-pdf/renderer`).

---

### 3. Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons, `html2pdf.js` (or `react-to-print`).
- **Backend:** Node.js, Express.js, CORS, `dotenv`, `@google/genai` (or `openai` SDK).
- **Architecture:** Clean, modular folder structure separating UI components, API clients, and helper utilities.

---

### 4. Technical Specifications & LLM Prompting Logic
In the backend Express route (`/api/generate-resume`), configure the LLM prompt as follows:

- **System Role:** "You are an expert ATS (Applicant Tracking System) Specialist and Career Coach."
- **Task:** 
  1. Analyze the provided `Profile Details` against the `Job Description`.
  2. Optimize bullet points using the **X-Y-Z Action Verb Method** (Accomplished X, measured by Y, by doing Z).
  3. Tailor the content to achieve a **90+ ATS Score** by mapping core skills to the job description requirements.
  4. Output structured JSON containing:
     - `atsScore`: Number (0-100)
     - `matchingKeywords`: Array of strings
     - `missingKeywords`: Array of strings
     - `optimizedProfile`: Complete structured object containing rewritten Professional Summary, Work/Project bullets, and optimized Skill list.

---

### 5. UI/UX Requirements
- **Modern Dashboard Layout:** Left panel for input forms (Profile Data + JD) and Right panel for Live Resume Preview & ATS Score Card.
- **Form UX:** Collapsible accordion sections for Personal Info, Skills, Projects, and Education.
- **ATS Score Indicator:** A visually clean circular score meter or progress bar showing the ATS score (target: 90%+).
- **One-Click Download:** Prominent "Download PDF" button that formats the printable area neatly onto standard A4 page dimensions with appropriate margins.

---

### 6. Code Output
Please provide step-by-step code structure and files:
1. `backend/server.js` & route handlers.
2. `frontend/src/App.jsx` and key components (`ProfileForm.jsx`, `ResumePreview.jsx`, `AtsScoreBadge.jsx`).
3. PDF export setup utility.
4. Detailed setup instructions for `npm install` and running local dev servers.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://atsfriendly-resume-builder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b87f83e0-767a-48d2-9459-f878b8026ffb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
