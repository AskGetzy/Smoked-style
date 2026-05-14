const { Paragraph, PageBreak } = require("docx");
const { h1, h2, note, spacer, promptBox, makeTable } = require("../helpers");
const projectSetupPrompt = require("../prompts/project-setup");
const databaseSchemaPrompt = require("../prompts/database-schema");
const seedProductsPrompt = require("../prompts/seed-products");

module.exports = [
  // ── TECH STACK ─────────────────────────────────────────────────────────
  h1("Tech Stack & Project Setup"),
  spacer(),
  h2("Your Stack"),
  makeTable(
    ["Layer", "Technology", "Why"],
    [
      ["Framework", "Next.js 14 (App Router)", "Handles frontend and backend in one project"],
      ["Database", "Supabase (PostgreSQL)", "Real-time, auth, file storage all in one"],
      ["Authentication", "Supabase Auth + Google OAuth", "Google Sign-In for customers, email/password for admin"],
      ["Payments", "Stripe", "Authorize/capture flow, saved cards, webhooks"],
      ["Push Notifications", "Supabase Realtime + Web Push", "New order alerts for admin"],
      ["Label Printing", "ZPL (Zebra Print Language)", "Compatible with your Zebra printer"],
      ["Route Optimization", "Google Maps Routes API", "Phase 2 — driver routing"],
      ["Hosting", "Vercel", "Free tier, auto-deploys from Git"],
      ["Styling", "Tailwind CSS", "Fast, clean UI"],
    ],
    [2200, 2800, 4360],
  ),
  spacer(),

  h2("Step 1 — Project Setup Prompt"),
  note("Run this FIRST before any other prompt. Only run once."),
  spacer(),
  promptBox("PROJECT SETUP", projectSetupPrompt),
  spacer(),

  h2("Step 2 — Database Setup Prompt"),
  note("Run this after project setup. Creates all the database tables."),
  spacer(),
  promptBox("DATABASE SCHEMA", databaseSchemaPrompt),
  spacer(),

  h2("Step 3 — Seed Data Prompt"),
  note("Run this after the database schema is created. Populates all products."),
  spacer(),
  promptBox("SEED PRODUCTS", seedProductsPrompt),
  spacer(),
  new Paragraph({ children: [new PageBreak()] }),
];
