# 🎯 FINSCORE

**An intelligent financial scoring and loan management platform for Indian microfinance and government-backed lending schemes.**

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge)](https://finscore-murex.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge)](https://react.dev/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**FINSCORE** is a sophisticated financial decision-making platform designed to streamline loan applications and credit scoring for government schemes like NBCFDC, NMDFC, and NSKFDC. It combines advanced machine learning models (XGBoost, CatBoost, DeepForest) with consumption pattern analysis to provide instant, fair, and data-driven credit decisions.

### Key Use Cases
- 📱 **Loan Application Processing** — Multi-step wizard for capturing applicant details
- 🧠 **AI-Powered Credit Scoring** — ML models analyzing repayment probability
- 📊 **Consumption Pattern Analysis** — Electricity, mobile recharge, and utility payment tracking
- ✅ **Application Management** — Dashboard for reviewing, approving, and tracking loans
- 📈 **Analytics & Fairness** — SHAP value interpretability for transparent decisions

---

## ✨ Key Features

### 🔐 **Authentication & Authorization**
- NextAuth integration with JWT tokens
- Role-based access control
- Secure password encryption with bcryptjs

### 📝 **Multi-Step Application Wizard**
- **Step 1 — Personal Info**: Name, Aadhaar, PAN, DoB, Gender, Category, Education
- **Step 2 — Address**: Full address, State, District, Pincode (35 Indian states + UTs)
- **Step 3 — Income & Employment**: Occupation, Monthly Income, Bank Details, IFSC
- **Step 4 — Loan Details**: Amount (₹10,000+), Purpose, Tenure, Scheme Type
- **Step 5 — Consumption Data**: 4 sliders (0–100) for behavioral patterns
- **Step 6 — Review & Submit**: Summary with 3 consent checkboxes

### 🤖 **Advanced Scoring Engine**
- **Multiple ML Models**: XGBoost, CatBoost, DeepForest ensemble
- **Feature Importance**: SHAP values with positive/negative direction indicators
- **Risk Classification**: Risk grades and confidence scores
- **Consumption Scoring**: Electricity regularity, mobile recharge patterns, utility payments
- **Repayment Score**: Historical payment analysis

### 📊 **Comprehensive Dashboard**
- Application list with pagination and filtering
- Real-time status tracking (Submitted, Approved, Rejected, Disbursed)
- Loan amount and EMI calculations
- Risk grade visualization
- Decision timeline and approval/rejection reasons

### 📱 **Responsive Design**
- Mobile-optimized interface
- Dark mode support with `next-themes`
- Tailwind CSS + Shadcn UI components
- Accessible ARIA labels throughout

### 📄 **Document Management**
- Document upload/download capabilities
- Multiple file format support
- Organized storage system

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Server Components)
- **UI Library**: React 19 with Shadcn UI components
- **Styling**: Tailwind CSS 4 + TailwindCSS Postcss
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand, TanStack React Query
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js + Bun (JavaScript bundler)
- **Database**: Prisma ORM
- **Authentication**: NextAuth.js 4
- **Validation**: Zod schema validation
- **Hosting**: Vercel (Frontend)

### DevOps & Tools
- **Linting**: ESLint 9
- **Build**: Next.js 16 with standalone output
- **Package Manager**: Bun / npm
- **Reverse Proxy**: Caddy (optional)

---

## 📁 Project Structure

```
FINSCORE/
├── src/
│   ├── components/
│   │   ├── applications/
│   │   │   ├── application-wizard.tsx      # 6-step loan form
│   │   │   ├── application-detail.tsx      # Scoring results & SHAP viz
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── applications-list.tsx       # Dashboard with tables
│   │   │   ├── application-detail.tsx      # Detail page with tabs
│   │   │   └── ...
│   │   ├── ui/                            # Shadcn components
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts                          # API client
│   │   ├── zod-resolver.ts                # Zod integration
│   │   └── ...
│   ├── store/
│   │   ├── use-app-store.ts               # App state (Zustand)
│   │   ├── use-auth-store.ts              # Auth state
│   │   └── ...
│   ├── app/                                # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── ...
│   └── styles/
│       └── globals.css
├── prisma/
│   ├── schema.prisma                       # Database schema
│   └── migrations/
├── public/
│   └── (static assets & screenshots)
├── db/                                     # Database files (SQLite)
├── mini-services/                          # Microservices
│   └── (service directories)
├── tests/
│   └── (test scripts)
├── .zscripts/                             # Build & deployment scripts
│   ├── dev.sh                             # Dev startup
│   ├── build.sh                           # Build script
│   └── ...
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── components.json                         # Shadcn config
├── postcss.config.mjs
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** or **Bun 1.0+**
- **Git**
- A modern browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RajAstha1/FINSCORE.git
   cd FINSCORE
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Or using Bun (recommended)
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update `.env.local` with:
   - Database URL
   - NextAuth credentials
   - API endpoints

4. **Set up database**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Or generate Prisma client
   npm run db:generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   # Or with Bun
   bun run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:push          # Push schema changes (with data loss acceptance)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database
```

### Key Commands for Development
```bash
# Run specific tasks
bash .zscripts/dev.sh                          # Full dev environment
bash .zscripts/mini-services-install.sh        # Install microservices
bash .zscripts/mini-services-build.sh          # Build microservices
```

### Code Quality
- **TypeScript** for type safety
- **Zod** for runtime validation
- **ESLint** for code linting
- **React Hook Form** for form handling

---

## 🗄️ Database

### Schema Highlights
- **Users**: Authentication and profile management
- **Beneficiaries**: Applicant personal & demographic data
- **Applications**: Loan requests with status tracking
- **Scores**: ML model outputs (XGBoost, CatBoost, DeepForest, SHAP)
- **Decisions**: Approval/rejection with reasons
- **Repayments**: EMI and repayment tracking
- **Documents**: File uploads and metadata

### Migrations
```bash
# Create new migration
npm run db:migrate -- --name add_feature

# Apply pending migrations
npm run db:push

# Inspect database
prisma studio
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/signup` — User registration
- `POST /api/auth/logout` — User logout

### Applications
- `GET /api/applications` — List all applications (paginated)
- `POST /api/applications` — Create new application
- `GET /api/applications/:id` — Get application details
- `PATCH /api/applications/:id` — Update application
- `DELETE /api/applications/:id` — Delete application

### Scoring
- `POST /api/score` — Calculate credit score
- `GET /api/score/:applicationId` — Get score details with SHAP

### Documents
- `POST /api/documents/upload` — Upload document
- `GET /api/documents/:id` — Download document
- `DELETE /api/documents/:id` — Delete document

---

## 🎨 UI Components

Built with **Shadcn UI** + **Tailwind CSS**:
- Buttons, Cards, Dialogs
- Forms, Inputs, Selects, Textareas
- Tables with sorting & pagination
- Tabs, Accordions, Badges
- Progress bars, Sliders, Tooltips
- Toast notifications (Sonner)
- Dropdowns, Menus, Popovers

---

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salting
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Zod runtime validation
- **CORS**: Next.js built-in CORS handling
- **Environment Secrets**: `.env.local` for sensitive data
- **Type Safety**: Full TypeScript compilation

---

## 📊 Performance

- **Server Components**: Next.js 16 RSC
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Data Fetching**: TanStack React Query with caching
- **Standalone Output**: Optimized production build

---

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
vercel deploy
```

### Docker / Self-Hosted
```bash
# Build Docker image
docker build -t finscore .
docker run -p 3000:3000 finscore
```

### Environment Setup
```bash
NODE_ENV=production
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://yourdomain.com
```

---

## 📸 Screenshots

The application includes comprehensive UI previews:
- **Dashboard** (Light & Dark modes)
- **Login** & Registration screens
- **Application Wizard** (6-step form)
- **Approval Panel** & Decision workflows
- **Mobile-responsive** views
- **Fairness Analytics** & SHAP visualizations

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update README for significant changes
- Maintain consistent code style with ESLint

---

## 📝 License

This project is **open source** and available under the [MIT License](LICENSE).

---

## 🆘 Support & Issues

- **GitHub Issues**: [Report bugs or request features](https://github.com/RajAstha1/FINSCORE/issues)
- **Email**: Contact the maintainers
- **Documentation**: Check the `AGENTS.md` and inline code comments

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), and [TypeScript](https://www.typescriptlang.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- ML model implementations using [XGBoost](https://xgboost.readthedocs.io/), [CatBoost](https://catboost.ai/), [DeepForest](https://github.com/xuyxu/Deep-Forest)
- State management with [Zustand](https://github.com/pmndrs/zustand)
- Database ORM: [Prisma](https://www.prisma.io/)

---

**Made with ❤️ by [RajAstha1](https://github.com/RajAstha1)**

[Live Demo](https://finscore-murex.vercel.app/) • [GitHub](https://github.com/RajAstha1/FINSCORE) • [Issues](https://github.com/RajAstha1/FINSCORE/issues)
