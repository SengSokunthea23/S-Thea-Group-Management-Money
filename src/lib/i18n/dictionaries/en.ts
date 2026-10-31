import { APP_NAME } from "@/lib/app";

/**
 * The English dictionary is the source of truth for the message catalogue:
 * `type Dictionary = typeof en`, so every other locale is checked against this
 * shape at compile time and a missing key is a type error, not a blank label.
 *
 * A `{ one, other }` object marks a count-sensitive message — see `plural()` in
 * ../translate.ts. Everything else is a plain string, optionally carrying
 * `{name}` placeholders filled in at call time.
 */
export const en = {
  common: {
    appName: APP_NAME,
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    saveChanges: "Save changes",
    edit: "Edit",
    delete: "Delete",
    deletePrompt: "Delete?",
    deleting: "Deleting…",
    confirm: "Confirm",
    optional: "Optional",
    actions: "Actions",
    empty: "—",
    close: "Close",
    closePanel: "Close panel",
    signOut: "Sign out",
    signingOut: "Signing out…",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    navigation: "Navigation",
  },

  nav: {
    collapse: "Collapse menu",
    expand: "Expand menu",
    groupMoney: "Money",
    groupSetup: "Setup",
    dashboard: "Analysis",
    entries: "Ledger",
    sources: "Income sources",
    settings: "Settings",
  },

  preferences: {
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
  },

  period: {
    label: "Period",
    month: "This month",
    quarter: "Last 3 months",
    year: "Last 12 months",
    all: "All time",
  },

  dashboard: {
    title: "Cost analysis",

    // The four figures the whole app exists to study.
    income: "Income",
    expenses: "Expenses",
    savings: "Savings",
    sources: "Income sources",

    sourceCount: {
      one: "{count} active source",
      other: "{count} active sources",
    },
    entryCount: { one: "{count} entry", other: "{count} entries" },
    savingsRate: "{percent}% of income",
    expenseRate: "{percent}% of income",
    noIncomeYet: "No income recorded yet",

    net: "Net balance",
    netPositive: "Income exceeded expenses",
    netNegative: "Expenses exceeded income",
    netEven: "Income matched expenses",

    trendTitle: "Income, expenses and savings by month",
    trendSubtitle: "{from} – {to}",
    trendEmpty: "Nothing recorded in the last 12 months yet.",
    trendLabel:
      "Income, expenses and savings by month, {from} to {to}. Income {income}, expenses {expenses}, savings {savings}.",
    trendTableCaption: "Income, expenses and savings by month",
    columnMonth: "Month",
    chartType: "Chart type",
    chartBars: "Bars",
    chartLine: "Line",

    expenseBreakdown: "Where the money went",
    expenseBreakdownEmpty: "No expenses in this period.",
    incomeBreakdown: "Where the money came from",
    incomeBreakdownEmpty: "No income in this period.",
    viewLedger: "View ledger",

    recent: "Recent entries",
    recentEmpty: "Nothing yet. Add an entry to get started.",
    budgets: "Budgets this month",
    budgetsEmpty: "No category has a budget yet.",
    budgetsAction: "Manage categories",
    overBudgetCount: {
      one: "{count} category over budget",
      other: "{count} categories over budget",
    },

    concentration: "Concentration",
    concentrationDetail: "Largest source is {percent}% of income",
    concentrationSingle: "All income from a single source",
  },

  entries: {
    title: "Ledger",
    count: { one: "{count} entry", other: "{count} entries" },
    new: "New entry",
    create: "Add entry",
    editTitle: "Edit entry",
    emptyTitle: "Nothing recorded yet",
    emptyBody:
      "Add income, an expense, or money set aside — the analysis builds from these.",
    emptyBodyFiltered: "No entries of this kind yet.",
    emptyBodyNoSources:
      "Add an income source first, then record what it paid you.",

    filterAll: "All",

    columnDate: "Date",
    columnType: "Type",
    columnDetail: "Detail",
    columnNote: "Note",
    columnAmount: "Amount",

    fieldType: "Type",
    fieldAmount: "Amount (USD)",
    fieldDate: "Date",
    fieldCategory: "Category",
    fieldBucket: "Set aside for",
    fieldSource: "Source",
    fieldNote: "Note",
    selectSource: "Select a source…",
    selectCategory: "Select a category…",
    dateHint: "Day first, e.g. 18/02/2025.",
    notePlaceholder: "What was this for?",
    fieldMerchant: "Paid to",
    fieldPaymentMethod: "Paid by",
    fieldReceipts: "Receipts and invoices",
    merchantPlaceholder: "Shop or person",
    noPaymentMethod: "Not recorded",
    receiptsHint: "Photos or PDF invoices, up to {count}.",
    addReceipt: "Add file",
    removeReceipt: "Remove",
    openReceipt: "Open",
    fromRecurring: "Recurring",
    columnMerchant: "Paid to",

    type: {
      INCOME: "Income",
      EXPENSE: "Expense",
      SAVING: "Saving",
    },

    expenseCategory: {
      HOUSING: "Housing",
      FOOD: "Food",
      TRANSPORT: "Transport",
      UTILITIES: "Utilities",
      HEALTH: "Health",
      EDUCATION: "Education",
      LEISURE: "Leisure",
      DEBT: "Debt",
      OTHER: "Other",
    },

    savingBucket: {
      EMERGENCY: "Emergency fund",
      INVESTMENT: "Investment",
      GOAL: "Goal",
      RETIREMENT: "Retirement",
      OTHER: "Other",
    },

    errors: {
      typeInvalid: "Choose income, expense, or saving.",
      amountInvalid: "Enter an amount like 1200 or 45.50.",
      amountPositive: "Enter an amount greater than zero.",
      amountTooLarge: "Amount is unrealistically large.",
      dateRequired: "A date is required.",
      dateInvalid: "Enter a date as dd/mm/yyyy.",
      categoryRequired: "Choose a category.",
      categoryInvalid: "Choose a valid category.",
      sourceRequired: "Choose which source this came from.",
      sourceMissing: "That source no longer exists.",
      noteTooLong: "Note must be 280 characters or fewer.",
      merchantTooLong: "That is too long \u2014 120 characters or fewer.",
      paymentMethodInvalid: "Choose a valid payment method.",
      attachmentType: "Attach a JPEG, PNG, WebP or PDF.",
      attachmentTooLarge: "That file is too large.",
      attachmentTooMany: "An expense can hold {count} files.",
      attachmentFailed: "That file could not be read.",
      deleteFailed: "Could not delete entry.",
    },
  },

  sources: {
    title: "Income sources",
    count: { one: "{count} source", other: "{count} sources" },
    activeCount: { one: "{count} active", other: "{count} active" },
    new: "New source",
    create: "Add source",
    editTitle: "Edit source",
    emptyTitle: "No income sources yet",
    emptyBody:
      "Name each place your money comes from. Counting them is one of the four figures the analysis reports.",

    columnSource: "Source",
    columnKind: "Kind",
    columnEntries: "Entries",
    columnTotal: "Total received",

    fieldName: "Name",
    fieldKind: "Kind",
    fieldActive: "Active",
    fieldNote: "Note",
    namePlaceholder: "Day job",
    notePlaceholder: "Anything worth remembering about it",
    activeHint: "Inactive sources keep their history but drop out of the count.",
    archived: "Archived",

    kind: {
      SALARY: "Salary",
      BUSINESS: "Business",
      FREELANCE: "Freelance",
      INVESTMENT: "Investment",
      RENTAL: "Rental",
      OTHER: "Other",
    },

    errors: {
      nameRequired: "A name is required.",
      nameTooLong: "Name must be 80 characters or fewer.",
      nameTaken: "You already have a source with this name.",
      kindInvalid: "Choose a valid kind.",
      noteTooLong: "Note must be 280 characters or fewer.",
      deleteFailed: "Could not delete source.",
      deleteHasEntries:
        "This source has entries. Archive it instead, or delete its entries first.",
    },
  },

  expense: {
    paymentMethod: {
      CASH: "Cash",
      CARD: "Card",
      BANK: "Bank transfer",
      OTHER: "Other",
    },
  },

  categories: {
    title: "Expense categories",
    description:
      "Your own categories, each with an optional monthly budget. Spending is measured against them on the analysis page.",
    count: { one: "{count} category", other: "{count} categories" },
    activeCount: { one: "{count} active", other: "{count} active" },
    new: "New category",
    create: "Add category",
    editTitle: "Edit category",
    emptyTitle: "No categories yet",
    emptyBody: "Add the categories you actually spend money on.",

    columnCategory: "Category",
    columnBudget: "Monthly budget",
    columnSpent: "Spent this month",
    columnEntries: "Entries",

    fieldName: "Name",
    fieldBudget: "Monthly budget (USD)",
    fieldTone: "Colour",
    fieldActive: "Active",
    namePlaceholder: "Groceries",
    budgetHint: "Leave empty to track spending without a limit.",
    activeHint: "Archived categories keep their history but stop being offered.",
    archived: "Archived",
    noBudget: "No budget",
    remaining: "{amount} left",
    overBy: "{amount} over",

    tone: {
      neutral: "Grey",
      indigo: "Indigo",
      emerald: "Green",
      amber: "Amber",
      rose: "Red",
    },

    errors: {
      nameRequired: "A name is required.",
      nameTooLong: "Name must be 60 characters or fewer.",
      nameTaken: "You already have a category with this name.",
      budgetInvalid: "Enter an amount like 400 or 1250.50.",
      budgetPositive: "A budget must be more than zero.",
      toneInvalid: "Choose a valid colour.",
      deleteFailed: "Could not delete category.",
      deleteHasEntries:
        "This category has expenses. Archive it instead, or move its expenses first.",
      missing: "That category no longer exists.",
    },
  },

  recurring: {
    title: "Recurring expenses",
    description:
      "Expenses that repeat every month. They are posted to the ledger automatically when the day arrives.",
    count: { one: "{count} template", other: "{count} templates" },
    new: "New recurring expense",
    create: "Add recurring expense",
    editTitle: "Edit recurring expense",
    emptyTitle: "Nothing repeats yet",
    emptyBody:
      "Rent, utilities, a subscription \u2014 anything you would otherwise type in every month.",

    columnWhat: "What",
    columnAmount: "Amount",
    columnDay: "Day",
    columnLast: "Last posted",

    fieldAmount: "Amount (USD)",
    fieldCategory: "Category",
    fieldDay: "Day of month",
    fieldStartsOn: "Starts",
    fieldActive: "Active",
    dayHint: "1 to 31. A day past the end of a short month falls on its last day.",
    startsOnHint: "Nothing is posted for months before this date.",
    activeHint: "Paused templates stop posting but keep their history.",
    paused: "Paused",
    never: "Never",
    onDay: "Day {day}",
    posted: {
      one: "{count} recurring expense was posted.",
      other: "{count} recurring expenses were posted.",
    },

    errors: {
      dayInvalid: "Choose a day between 1 and 31.",
      deleteFailed: "Could not delete this template.",
    },
  },

  planner: {
    title: "Money planner",
    subtitle: "Try numbers out. Nothing here changes your ledger.",
    intro:
      "Starting figures come from your last {months} months. Change anything you like.",

    leftover: "Left over",
    verdictSurplus: "This plan leaves money spare.",
    verdictBalanced: "This plan comes out even.",
    verdictShortfall: "This plan spends more than it earns.",

    income: "Monthly income",
    spending: "Spending",
    saving: "Set aside",
    savingsRate: "{percent}% of income.",
    noCategories: "Add expense categories to plan against them.",
    trimHint: "Cut {amount} here to break even",
    balance: "Balance it",

    splitHeading: "A common starting point",
    splitIntro:
      "The 50/30/20 rule of thumb, applied to your income. It is a general guide, not advice about your situation.",
    splitNeeds: "Essentials (50%)",
    splitWants: "Everything else (30%)",
    splitSavings: "Set aside (20%)",
    ceilingOk: "Your spending fits under {amount}.",
    ceilingOver: "Your spending is {amount} above the guide.",
    floorOk: "You are setting aside at least {amount}.",
    floorUnder: "You are {amount} short of the guide.",

    notSaved: "Nothing is saved",
    reset: "Reset",
  },

  settings: {
    title: "Settings",
    tabProfile: "Profile",
    tabMembers: "Members",
    tabCategories: "Categories",
    tabRecurring: "Recurring",
    tabDevices: "Devices",

    profileHeading: "Your information",
    profileDescription: "This is how you appear across the app.",
    passwordHeading: "Password",
    passwordDescription: "Changing your password signs out your other sessions.",
    appearanceHeading: "Appearance",
    appearanceDescription:
      "Language and colour scheme apply to this browser right away.",

    fieldFullName: "Full name",
    fieldPhoto: "Profile photo",
    choosePhoto: "Choose photo",
    removePhoto: "Remove",
    photoHint: "JPEG, PNG or WebP. Cropped to a square and resized to 256px.",
    fieldEmail: "Email",
    fieldLanguage: "Language",
    fieldAddress: "Address",
    emailHint: "Email is your sign-in identity and can’t be changed here.",
    languageHint: "Saving also switches the interface to this language.",
    addressPlaceholder: "Street, city, country",
    saveProfile: "Save profile",

    fieldCurrentPassword: "Current password",
    fieldNewPassword: "New password",
    fieldConfirmPassword: "Confirm new password",
    passwordHint: "At least {count} characters.",
    changePassword: "Change password",
    changingPassword: "Changing…",

    errors: {
      nameRequired: "Full name is required.",
      nameTooLong: "Full name must be 120 characters or fewer.",
      languageInvalid: "Choose a valid language.",
      addressTooLong: "Address must be 500 characters or fewer.",
      avatarType: "Choose a JPEG, PNG or WebP image.",
      avatarTooLarge: "That image is too large.",
      avatarUnreadable: "That image could not be read.",
      sessionExpired: "Your session has expired. Sign in again.",
      currentPasswordRequired: "Enter your current password.",
      currentPasswordWrong: "Current password is incorrect.",
      newPasswordRequired: "Enter a new password.",
      newPasswordTooShort: "Use at least {count} characters.",
      newPasswordSame: "New password must differ from the current one.",
      passwordMismatch: "Passwords do not match.",
    },

    profileUpdated: "Profile updated.",
    passwordChanged: "Password changed.",
    passwordChangedSessions: {
      one: "Password changed. {count} other session was signed out.",
      other: "Password changed. {count} other sessions were signed out.",
    },
  },

  devices: {
    heading: "Devices",
    count: { one: "{count} signed in", other: "{count} signed in" },
    thisDevice: "This device",
    unknownDevice: "Unrecognised device",
    detail: "Active {lastSeen} · signed in {signedIn}",
    signOutDevice: "Sign out",
    signOutAll: "Sign out all other devices",
    signingOut: "Signing out…",
    confirmAll: { one: "Sign out {count} device?", other: "Sign out {count} devices?" },
    revoked: "That device was signed out.",
    revokedAll: {
      one: "{count} other device was signed out.",
      other: "{count} other devices were signed out.",
    },
    note: "Every device that is signed in to your account appears here. If you do not recognise one, sign it out and change your password.",
    errors: {
      cannotRevokeCurrent: "Use Sign out in the menu to end this session.",
      revokeFailed: "That device was already signed out.",
      noOthers: "No other devices are signed in.",
    },
  },

  members: {
    heading: "Members",
    count: { one: "{count} person", other: "{count} people" },
    columnMember: "Member",
    columnAddress: "Address",
    columnLanguage: "Language",
    columnJoined: "Joined",
    you: "You",
    note: "Members are sign-in accounts, and each keeps a separate ledger — figures are never shared between accounts. Inviting and removing members isn’t built yet; accounts come from the seed.",
  },

  recovery: {
    title: "Reset your password",
    subtitle:
      "Confirm the phone number on your account and we will send you a code.",
    fieldPhone: "Phone number",
    phoneHint: "With or without the country code. Cambodian numbers assume +855.",
    sendCode: "Send code",
    sending: "Sending…",
    codeSent: "If {phone} is on an account, a code is on its way.",
    devCode: "Development only — your code is {code}",
    fieldCode: "Verification code",
    verifyCode: "Verify",
    verifying: "Verifying…",
    useAnotherNumber: "Use a different number",
    chooseNewPassword: "Choose a new password.",
    setPassword: "Set password and sign in",
    signsOutOthers: "Every other device will be signed out.",
    smsBody: "{code} is your password reset code. It expires in 10 minutes.",

    qrHeading: "Or sign in with a QR code",
    qrDescription:
      "If another device is still signed in to this account, you can scan a code with it instead — your password stays as it is.",
    qrAction: "Show a QR code",
    backToLogin: "Back to sign in",

    errors: {
      phoneInvalid: "Enter a valid phone number.",
      codeRequired: "Enter the code.",
      codeInvalid: "That code is not right.",
      codeExpired: "That code has expired. Request a new one.",
      tooManyAttempts: "Too many attempts. Request a new code.",
      rateLimited: "Too many codes requested. Try again in a few minutes.",
      startOver: "That took too long. Start again.",
    },
  },

  qr: {
    title: "Sign in with a QR code",
    subtitle:
      "Scan this with a device that is already signed in to your account, then approve it there.",
    codeLabel: "QR code for approving this sign-in",
    waiting: "Waiting for approval · {seconds}s",
    signedIn: "Approved. Signing you in…",
    rejected: "That request was rejected.",
    expired: "That code expired.",
    newCode: "Show a new code",
    showCode: "Show a QR code",
    preparing: "Preparing…",
    cannotScan: "Can’t scan it?",
    usePhoneInstead: "Use my phone number instead",
  },

  approve: {
    title: "Approve sign-in?",
    subtitle: "A browser is asking to sign in to your account.",
    device: "Device",
    ip: "IP address",
    requested: "Requested",
    account: "Account",
    warning:
      "Only approve this if you started it yourself. Approving signs that browser in as you.",
    approve: "Approve",
    reject: "Reject",
    approved: "Approved. The other device is signing in now.",
    rejected: "Rejected. Nothing was signed in.",
    errors: {
      expired: "That request has expired.",
      alreadyDecided: "That request has already been handled.",
    },
  },

  phone: {
    heading: "Recovery phone",
    description:
      "Used to reset your password if you are ever locked out. Only a verified number can do that.",
    field: "Phone number",
    hint: "With or without the country code. Leave empty to remove it.",
    add: "Add number",
    update: "Update number",
    confirm: "Confirm",
    isVerified: "Verified",
    notVerified: "Not verified",
    verified: "Phone number verified.",
    removed: "Phone number removed.",
    smsBody: "{code} is your verification code. It expires in 10 minutes.",
    errors: {
      taken: "That number is already on another account.",
    },
  },

  login: {
    title: "Sign in",
    subtitle: "Enter your credentials to continue.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    missingFields: "Enter your email and password.",
    invalidCredentials: "Email or password is incorrect.",
    forgotPassword: "Forgot password?",
    useQr: "Sign in with a QR code instead",
  },
};

export type Dictionary = typeof en;
