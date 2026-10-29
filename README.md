# EVA Pharma — Insulin Pen Dispensing & Patient Support Program

> Official Corporate Patient Support, Field Representative Analytics & Standalone Pharmacy Dispensing Solution with Microsoft 365 / SharePoint Integration.

---

## 🌟 Portals & Architecture

This application provides two completely separated portals:

### 1. Management & Field Representative Portal (Main Entry)
- **URL Route:** `/` (e.g. `https://hadyfouda.github.io/Pen-Program-System/`)
- **Audience:** EVA Pharma field reps, supervisors, and program managers.
- **Authentication:** Corporate `@evapharma.com` verification passcode & encrypted personal password.
- **Capabilities:**
  - Dynamic enrollment of private doctor clinics, pharmacies, and hospital centers.
  - Automatic 6-digit PIN generation & WhatsApp account sharing.
  - Real-time stock quota tracking & dispensation analytics.
  - Dispense audit logs, exception overrides, and patient history checks.
  - Linked official EVA Pharma SharePoint / OneDrive database workbook.

### 2. Standalone Pharmacy & Clinic Dispensing Portal (Isolated Station)
- **URL Route:** `/?portal=true` or `/#/portal` (e.g. `https://hadyfouda.github.io/Pen-Program-System/?portal=true`)
- **Audience:** Pharmacists and private clinic doctors.
- **Authentication:** 6-digit facility PIN.
- **Capabilities:**
  - Zero access to management settings or field rep analytics.
  - Quick patient national ID & prescription verification.
  - Client-side document image compression (<250 KB) for high-speed uploads.
  - Current pen stock balance check & 1-click restock request modal.

---

## 🚀 Live GitHub Deployment

This project includes automated deployment to **GitHub Pages** via GitHub Actions:
- On every push to the `main` branch, the workflow (`.github/workflows/deploy.yml`) builds and deploys the production bundle automatically.
- Assets use relative paths (`base: "./"` in `vite.config.ts`) ensuring flawless routing.
- `public/404.html` provides fallback redirection for all deep links.

### How to Publish to GitHub:

1. Create a repository on GitHub (e.g., `https://github.com/new`) with name: `Pen-Program-System`
2. Link and push the code:
```bash
git remote add origin https://github.com/hadyfouda/Pen-Program-System.git
git branch -M main
git push -u origin main
```
3. Enable GitHub Pages in Repository Settings:
   - Go to: **Settings** -> **Pages**
   - Under **Build and deployment** -> **Source**: Select **GitHub Actions**
4. Once completed, your system will be live at:
   - **Management Portal:** `https://hadyfouda.github.io/Pen-Program-System/`
   - **Pharmacy Portal:** `https://hadyfouda.github.io/Pen-Program-System/?portal=true`

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

&copy; EVA Pharma — Insulin Pen Patient Support Program.
