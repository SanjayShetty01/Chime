# Building the Chime Frontend UI

The following is a comprehensive prompt engineering guide that describes exactly how to generate the current Chime frontend application from scratch using an AI coding assistant. 

---

## 1. Project Initialization & Foundation
**Prompt:**
> "I want to build a modern web application called 'Chime' for tracking credit card cashback. 
> 
> Please initialize a new frontend project using **Vite, React, and TypeScript**. 
> Install and configure **Tailwind CSS** for styling, and initialize **Shadcn UI** (with Radix UI primitives) to handle all complex accessible components. 
> Ensure the application supports dark mode via `next-themes` and uses `lucide-react` for all icons. 
> Also, install `react-router-dom` for handling page navigation and `@tanstack/react-query` for API state management."

## 2. Global Styling & Design System
**Prompt:**
> "Let's establish a premium, high-contrast design system.
> 
> Modify the `index.css` to use Hex color variables. 
> The primary accent color must be a vibrant golden/orange: `#f59e0b`.
> Configure the `.dark` mode to have deep, rich black backgrounds (`#020617`) rather than flat greys. 
> 
> Ensure all Shadcn components natively inherit this golden primary color for buttons, active states, and focus rings."

## 3. Core Types & Mock Data Structure
**Prompt:**
> "Before building the UI, let's establish our data models.
> 
> In `src/types/index.ts`, define the following interfaces:
> 1. `CardConfig`: Tracking a card's ID, bank name, card name, hex color, and a Lucide icon name.
> 2. `Transaction`: Individual expenses with ID, date, description, category, amount, cashback rate, and cashback amount.
> 3. `CashbackSummary`: High-level stats tracking total spend, total cashback, effective percentage, and an array of `CategoryBreakdown`.
> 4. `CashbackResult`: The final payload containing a `CardConfig`, a `Transaction[]`, and a `CashbackSummary`.
> 
> Then, create a `src/config/cards.ts` file that exports a categorized dictionary of supported Indian credit cards (e.g., HDFC Millennia, SBI Cashback) grouped by bank. Give each card a distinct theme color.
> Finally, create a `src/mocks/transactions.ts` file containing a realistic set of dummy data adhering to these interfaces."

## 4. Authentication Context (Name Only)
**Prompt:**
> "Implement a minimal, mock authentication flow.
> 
> Create `src/contexts/AuthContext.tsx`. 
> The authentication should *not* require a password or an email. It should only ask for the user's `name`. 
> Export a `useAuth` hook that provides the current `user` object, a `login(name)` function, and a `logout()` function.
> Wrap the entire application in this provider inside `App.tsx`."

## 5. Building the Pages: Login
**Prompt:**
> "Create the entry point: `src/pages/LoginPage.tsx`.
> 
> Use Shadcn UI's `Card` components to build a centered login box. 
> Incorporate an SVG logo of a credit card at the top.
> The form should have a single input field: `Name` (e.g., 'Sanjay'). 
> The submit button should say 'Get Started'. 
> When submitted, call the `login` function from `AuthContext` and navigate the user to `/upload`.
> Add a ThemeToggle button in the absolute top right corner of the screen."

## 6. Building the Pages: Upload
**Prompt:**
> "Create the primary action page: `src/pages/UploadPage.tsx`. 
> This page must be protected by a ProtectedRoute wrapper in `App.tsx`.
> 
> **Header:** Build a clean top navbar displaying the application logo on the left, and the user's `name` with a logout button on the right.
> 
> **Main Content:** Build a Shadcn `Card` containing a form with three required fields:
> 1. A Shadcn `Select` dropdown that iterates through our `cards.ts` config, grouping options by Bank.
> 2. A drag-and-drop file upload zone for a PDF statement. If a file is selected, show a document icon and the file size.
> 3. A password `Input` field for the encrypted PDF.
> 
> When submitted, put the button in a loading state for 1.5 seconds, then navigate to `/results`, passing the mock `CashbackResult` payload via React Router state."

## 7. Building the Pages: The Results Dashboard
**Prompt:**
> "Create the analytics view: `src/pages/ResultsPage.tsx`.
> 
> **Dynamic Header:** The background of the header should dynamically adapt its tint to match the specific credit card the user selected (using the `card.color` from the mock data). 
> 
> **Tab Navigation:** Implement Shadcn `Tabs` to navigate between exactly three sections:
> 1. **Transactions:** A data table (`TransactionTable.tsx`) listing all individual expenses and their computed cashback.
> 2. **Dashboard:** A visual analytics view (`CategoryCharts.tsx`) utilizing `recharts` to render a Bar chart or Pie chart breaking down spend versus generated cashback by category.
> 3. **AI Insights:** A card view (`AiSuggestions.tsx`) providing actionable plain-text advice based on their spending habits.
> 
> Above the tabs, render a `SummaryCards.tsx` component that uses Shadcn `Cards` to display three large metric numbers: Total Spend, Total Cashback, and Effective Rate."

## 8. Final Polish & Logo
**Prompt:**
> "Finally, let's refine the branding.
> 
> Create a raw `logo.svg` in the `public` folder that displays a minimalist line-art credit card. Do not use generic fonts, render it purely using SVG paths and rectangles. Make sure the stroke color is identical to our primary Tailwind accent color: `#f59e0b`.
> Link this SVG as the primary favicon in `index.html`. 
> Lastly, ensure every page uses a subtle `bg-muted/30` background to make the white Shadcn cards pop."
