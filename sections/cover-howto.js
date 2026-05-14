const { Paragraph, TextRun, PageBreak, AlignmentType } = require("docx");
const { h1, h2, h3, p, note, bullet, numbered, spacer, promptBox } = require("../helpers");

module.exports = [
  // ── COVER ──────────────────────────────────────────────────────────────
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1440, after: 300 },
    children: [new TextRun({ text: "SMOKED STYLE", bold: true, size: 72, color: "1A3C5E" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({ text: "Cursor Agent — Complete Build Instructions", size: 36, color: "C85C2D", bold: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: "Phase 1: Storefront + Admin Backend", size: 26, color: "555555" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 900 },
    children: [
      new TextRun({
        text: "Use this document to instruct Cursor agent screen by screen.",
        size: 22,
        color: "888888",
        italics: true,
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  // ── HOW TO USE ─────────────────────────────────────────────────────────
  h1("How To Use This Document"),
  p("This document is your step-by-step build guide for Cursor agent. Each section contains:"),
  bullet("A plain-English explanation of what you are building"),
  bullet("The exact prompt to paste into Cursor agent"),
  bullet("Rules and notes to check before moving to the next step"),
  spacer(),
  note("Do NOT give Cursor more than one prompt at a time. Build one screen, test it, then move to the next. This is the most important rule."),
  spacer(),
  p("Before starting, read the Golden Rules below. They apply to every single prompt you give Cursor."),
  spacer(),

  h2("Golden Rules for Every Prompt"),
  numbered("One screen at a time. Never ask Cursor to build two screens in one prompt."),
  numbered("Test before continuing. Click through every button and field before moving to the next prompt."),
  numbered("Tell Cursor your stack every time. Start every prompt with the stack reminder (included in each prompt below)."),
  numbered("Never delete working code. If something breaks, tell Cursor what broke, not to start over."),
  numbered("Save your work. After each working screen, commit to Git or make a backup."),
  numbered("If Cursor gets confused, paste the relevant section of the spec document and say: 'Follow this spec exactly.'"),
  new Paragraph({ children: [new PageBreak()] }),
];
