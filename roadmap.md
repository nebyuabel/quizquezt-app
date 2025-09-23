────────────────────────────  
QuizQuezt – Feature-Builder Template  
────────────────────────────

Use this markdown file as a **living spec**.  
Copy it into a new file (`roadmap.md`) and **fill in the blanks**.  
When you update it, paste the changed blocks back to me and we’ll code the next slice.

---

### 1. Core Scope

| Item          | Current State                         | Next Priority | Notes   |
| ------------- | ------------------------------------- | ------------- | ------- |
| Auth          | ✅ Google + Email/PW                  | —             | working |
| Avatar upload | ✅ Storage bucket                     | —             | working |
| Quiz engine   | ✅ Subject + grade filter → quiz-play | —             | working |
| Leaderboard   | ✅ Top 100 by XP                      | —             | working |

---

### 2. Next Features (rank 1-5)

Put **1** for the **very next** item we should build.

| #   | Feature                | Short Description               | Est. Effort | Notes / Acceptance Criteria       |
| --- | ---------------------- | ------------------------------- | ----------- | --------------------------------- |
|     | Daily Streak Logic     | server-side streak + freeze     | M           | Reset at 00:00 UTC; push reminder |
|     | In-app Coin Store      | buy freeze, themes, etc.        | M           | Stripe or IAP                     |
|     | Push Notifications     | streak reminder, new quiz alert | S           | Expo Notifications                |
|     | Dark-mode Toggle       | system + manual switch          | S           | Tailwind dark:                    |
|     | Leaderboard Pagination | load more & search user         | S           | 20 per page                       |
|     | (add your own)         |                                 |             |                                   |

---

### 3. Data Model Add-ons

Check or add rows you’ll need.

| Table / Column                    | Reason                          |
| --------------------------------- | ------------------------------- |
| `profiles.current_streak`         | consecutive days                |
| `profiles.last_quiz_completed_at` | already exists – use for streak |
| `purchases (new)`                 | coin transactions               |
| `settings (new)`                  | dark-mode flag                  |
| `notifications (new)`             | Expo push tokens                |
| `…`                               | your idea here                  |

---

### 4. UI / UX Mocks (optional)

Paste **lo-fi screenshots**, **Figma links**, or **ASCII** below.

```
┌──────────────┐
│   Streak 🔥  │
│    7 days    │
│  (freeze 2)  │
└──────────────┘
```

---

### 5. Open Questions

- Which **notification service**? Expo or Firebase?
- **Payment provider**? Stripe, RevenueCat, or none for MVP?
- Any **backend edge cases** (time-zones, daylight-saving)?

---

### 6. Milestone Checklist

- [ ] Template filled by you
- [ ] Priority 1 agreed
- [ ] First PR / branch created

---

Once you’ve filled the blanks, paste the **rank-1 feature block** back and we’ll start coding it together.
