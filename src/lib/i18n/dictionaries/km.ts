import { APP_NAME } from "@/lib/app";
import type { Dictionary } from "./en";

/**
 * Khmer (ភាសាខ្មែរ). Typed as `Dictionary`, so leaving a key out is a compile
 * error rather than an English string leaking into a Khmer screen.
 *
 * Khmer has no grammatical plural, so the `one` / `other` forms of a count
 * message are deliberately identical — the shape is kept only because the
 * catalogue is shared.
 */
export const km: Dictionary = {
  common: {
    appName: APP_NAME,
    cancel: "បោះបង់",
    save: "រក្សាទុក",
    saving: "កំពុងរក្សាទុក…",
    saveChanges: "រក្សាទុកការកែប្រែ",
    edit: "កែសម្រួល",
    delete: "លុប",
    deletePrompt: "លុបមែនទេ?",
    deleting: "កំពុងលុប…",
    confirm: "បញ្ជាក់",
    optional: "ស្រេចចិត្ត",
    actions: "សកម្មភាព",
    empty: "—",
    close: "បិទ",
    closePanel: "បិទផ្ទាំង",
    signOut: "ចាកចេញ",
    signingOut: "កំពុងចាកចេញ…",
    openNavigation: "បើកម៉ឺនុយ",
    closeNavigation: "បិទម៉ឺនុយ",
    navigation: "ម៉ឺនុយ",
  },

  nav: {
    dashboard: "ការវិភាគ",
    entries: "សៀវភៅកត់ត្រា",
    sources: "ប្រភពចំណូល",
    settings: "ការកំណត់",
  },

  preferences: {
    language: "ភាសា",
    theme: "រូបរាង",
    themeLight: "ភ្លឺ",
    themeDark: "ងងឹត",
    themeSystem: "តាមប្រព័ន្ធ",
  },

  period: {
    label: "រយៈពេល",
    month: "ខែនេះ",
    quarter: "៣ ខែចុងក្រោយ",
    year: "១២ ខែចុងក្រោយ",
    all: "ទាំងអស់",
  },

  dashboard: {
    title: "ការវិភាគចំណាយ",

    income: "ចំណូល",
    expenses: "ចំណាយ",
    savings: "ប្រាក់សន្សំ",
    sources: "ប្រភពចំណូល",

    sourceCount: {
      one: "ប្រភពសកម្ម {count}",
      other: "ប្រភពសកម្ម {count}",
    },
    entryCount: { one: "{count} កំណត់ត្រា", other: "{count} កំណត់ត្រា" },
    savingsRate: "{percent}% នៃចំណូល",
    expenseRate: "{percent}% នៃចំណូល",
    noIncomeYet: "មិនទាន់មានចំណូលកត់ត្រាទេ",

    net: "សល់សុទ្ធ",
    netPositive: "ចំណូលលើសចំណាយ",
    netNegative: "ចំណាយលើសចំណូល",
    netEven: "ចំណូលស្មើនឹងចំណាយ",

    trendTitle: "ចំណូល ចំណាយ និងប្រាក់សន្សំតាមខែ",
    trendSubtitle: "{from} – {to}",
    trendEmpty: "មិនទាន់មានកំណត់ត្រាក្នុងរយៈពេល ១២ ខែចុងក្រោយទេ។",
    chartBar: "ក្រាហ្វិកជួរឈរ",
    chartLine: "ក្រាហ្វិកបន្ទាត់",
    trendLabel:
      "ចំណូល ចំណាយ និងប្រាក់សន្សំតាមខែ ពី {from} ដល់ {to}។ ចំណូល {income}, ចំណាយ {expenses}, ប្រាក់សន្សំ {savings}។",
    trendTableCaption: "ចំណូល ចំណាយ និងប្រាក់សន្សំតាមខែ",
    columnMonth: "ខែ",

    expenseBreakdown: "លុយបានចេញទៅណា",
    expenseBreakdownEmpty: "គ្មានចំណាយក្នុងរយៈពេលនេះទេ។",
    incomeBreakdown: "លុយបានមកពីណា",
    incomeBreakdownEmpty: "គ្មានចំណូលក្នុងរយៈពេលនេះទេ។",
    viewLedger: "មើលសៀវភៅកត់ត្រា",

    recent: "កំណត់ត្រាថ្មីៗ",
    recentEmpty: "មិនទាន់មានអ្វីទេ។ បន្ថែមកំណត់ត្រាដើម្បីចាប់ផ្ដើម។",

    concentration: "កម្រិតប្រមូលផ្ដុំ",
    concentrationDetail: "ប្រភពធំជាងគេស្មើ {percent}% នៃចំណូល",
    concentrationSingle: "ចំណូលទាំងអស់មកពីប្រភពតែមួយ",
  },

  entries: {
    title: "សៀវភៅកត់ត្រា",
    count: { one: "{count} កំណត់ត្រា", other: "{count} កំណត់ត្រា" },
    new: "កំណត់ត្រាថ្មី",
    create: "បន្ថែមកំណត់ត្រា",
    editTitle: "កែសម្រួលកំណត់ត្រា",
    emptyTitle: "មិនទាន់មានកំណត់ត្រាទេ",
    emptyBody:
      "បន្ថែមចំណូល ចំណាយ ឬប្រាក់ដែលបានទុកសន្សំ — ការវិភាគកើតឡើងពីទិន្នន័យទាំងនេះ។",
    emptyBodyFiltered: "មិនទាន់មានកំណត់ត្រាប្រភេទនេះទេ។",
    emptyBodyNoSources:
      "សូមបន្ថែមប្រភពចំណូលជាមុនសិន បន្ទាប់មកកត់ត្រាអ្វីដែលវាបានផ្ដល់ឲ្យអ្នក។",

    filterAll: "ទាំងអស់",

    columnDate: "កាលបរិច្ឆេទ",
    columnType: "ប្រភេទ",
    columnDetail: "លម្អិត",
    columnNote: "កំណត់សម្គាល់",
    columnAmount: "ចំនួនទឹកប្រាក់",

    fieldType: "ប្រភេទ",
    fieldAmount: "ចំនួនទឹកប្រាក់ (USD)",
    fieldDate: "កាលបរិច្ឆេទ",
    fieldCategory: "ប្រភេទចំណាយ",
    fieldBucket: "ទុកសម្រាប់",
    fieldSource: "ប្រភព",
    fieldNote: "កំណត់សម្គាល់",
    selectSource: "ជ្រើសរើសប្រភព…",
    selectCategory: "ជ្រើសរើសប្រភេទ…",
    dateHint: "ថ្ងៃមុនគេ ឧ. ១៨/០២/២០២៥។",
    notePlaceholder: "នេះសម្រាប់អ្វី?",

    type: {
      INCOME: "ចំណូល",
      EXPENSE: "ចំណាយ",
      SAVING: "សន្សំ",
    },

    expenseCategory: {
      HOUSING: "លំនៅឋាន",
      FOOD: "អាហារ",
      TRANSPORT: "ការធ្វើដំណើរ",
      UTILITIES: "សេវាប្រើប្រាស់",
      HEALTH: "សុខភាព",
      EDUCATION: "ការសិក្សា",
      LEISURE: "កម្សាន្ត",
      DEBT: "បំណុល",
      OTHER: "ផ្សេងៗ",
    },

    savingBucket: {
      EMERGENCY: "មូលនិធិបន្ទាន់",
      INVESTMENT: "ការវិនិយោគ",
      GOAL: "គោលដៅ",
      RETIREMENT: "ចូលនិវត្តន៍",
      OTHER: "ផ្សេងៗ",
    },

    errors: {
      typeInvalid: "សូមជ្រើសរើស ចំណូល ចំណាយ ឬសន្សំ។",
      amountInvalid: "សូមបញ្ចូលចំនួនទឹកប្រាក់ដូចជា 1200 ឬ 45.50។",
      amountPositive: "សូមបញ្ចូលចំនួនទឹកប្រាក់ធំជាងសូន្យ។",
      amountTooLarge: "ចំនួនទឹកប្រាក់ធំហួសហេតុ។",
      dateRequired: "ត្រូវការកាលបរិច្ឆេទ។",
      dateInvalid: "សូមបញ្ចូលកាលបរិច្ឆេទជាទម្រង់ dd/mm/yyyy។",
      categoryRequired: "សូមជ្រើសរើសប្រភេទ។",
      categoryInvalid: "សូមជ្រើសរើសប្រភេទឲ្យបានត្រឹមត្រូវ។",
      sourceRequired: "សូមជ្រើសរើសប្រភពដែលលុយនេះមកពី។",
      sourceMissing: "ប្រភពនោះលែងមានទៀតហើយ។",
      noteTooLong: "កំណត់សម្គាល់ត្រូវមិនលើសពី ២៨០ តួអក្សរ។",
      deleteFailed: "មិនអាចលុបកំណត់ត្រាបានទេ។",
    },
  },

  sources: {
    title: "ប្រភពចំណូល",
    count: { one: "{count} ប្រភព", other: "{count} ប្រភព" },
    activeCount: { one: "សកម្ម {count}", other: "សកម្ម {count}" },
    new: "ប្រភពថ្មី",
    create: "បន្ថែមប្រភព",
    editTitle: "កែសម្រួលប្រភព",
    emptyTitle: "មិនទាន់មានប្រភពចំណូលទេ",
    emptyBody:
      "ដាក់ឈ្មោះកន្លែងនីមួយៗដែលលុយរបស់អ្នកមកពី។ ចំនួនរបស់វាគឺជាតួលេខមួយក្នុងចំណោមបួនដែលការវិភាគរាយការណ៍។",

    columnSource: "ប្រភព",
    columnKind: "ប្រភេទ",
    columnEntries: "កំណត់ត្រា",
    columnTotal: "ទទួលបានសរុប",

    fieldName: "ឈ្មោះ",
    fieldKind: "ប្រភេទ",
    fieldActive: "សកម្ម",
    fieldNote: "កំណត់សម្គាល់",
    namePlaceholder: "ការងារប្រចាំថ្ងៃ",
    notePlaceholder: "អ្វីដែលគួរចងចាំអំពីវា",
    activeHint:
      "ប្រភពមិនសកម្មនៅរក្សាប្រវត្តិរបស់វា ប៉ុន្តែមិនរាប់បញ្ចូលក្នុងចំនួនទេ។",
    archived: "បានទុកចោល",

    kind: {
      SALARY: "ប្រាក់ខែ",
      BUSINESS: "អាជីវកម្ម",
      FREELANCE: "ការងារឯករាជ្យ",
      INVESTMENT: "ការវិនិយោគ",
      RENTAL: "ការជួល",
      OTHER: "ផ្សេងៗ",
    },

    errors: {
      nameRequired: "ត្រូវការឈ្មោះ។",
      nameTooLong: "ឈ្មោះត្រូវមិនលើសពី ៨០ តួអក្សរ។",
      nameTaken: "អ្នកមានប្រភពឈ្មោះនេះរួចហើយ។",
      kindInvalid: "សូមជ្រើសរើសប្រភេទឲ្យបានត្រឹមត្រូវ។",
      noteTooLong: "កំណត់សម្គាល់ត្រូវមិនលើសពី ២៨០ តួអក្សរ។",
      deleteFailed: "មិនអាចលុបប្រភពបានទេ។",
      deleteHasEntries:
        "ប្រភពនេះមានកំណត់ត្រា។ សូមទុកចោលវាជំនួសវិញ ឬលុបកំណត់ត្រារបស់វាជាមុនសិន។",
    },
  },

  settings: {
    title: "ការកំណត់",
    tabProfile: "ប្រវត្តិរូប",
    tabMembers: "សមាជិក",
    tabDevices: "ឧបករណ៍",

    profileHeading: "ព័ត៌មានរបស់អ្នក",
    profileDescription: "នេះជារបៀបដែលអ្នកបង្ហាញនៅទូទាំងកម្មវិធី។",
    passwordHeading: "ពាក្យសម្ងាត់",
    passwordDescription:
      "ការប្ដូរពាក្យសម្ងាត់នឹងធ្វើឲ្យវគ្គផ្សេងទៀតរបស់អ្នកចាកចេញ។",
    appearanceHeading: "រូបរាង",
    appearanceDescription: "ភាសា និងពណ៌ផ្ទាំងចូលជាធរមានភ្លាមៗលើកម្មវិធីរុករកនេះ។",

    fieldFullName: "ឈ្មោះពេញ",
    fieldPhoto: "រូបភាពប្រវត្តិរូប",
    choosePhoto: "ជ្រើសរើសរូបភាព",
    removePhoto: "ដកចេញ",
    photoHint: "JPEG, PNG ឬ WebP។ កាត់ជាការេ ហើយបង្រួមមក ២៥៦px។",
    fieldEmail: "អ៊ីមែល",
    fieldLanguage: "ភាសា",
    fieldAddress: "អាសយដ្ឋាន",
    emailHint: "អ៊ីមែលគឺជាអត្តសញ្ញាណចូលគណនី ហើយមិនអាចប្ដូរនៅទីនេះបានទេ។",
    languageHint: "ការរក្សាទុកនឹងប្ដូរភាសារបស់កម្មវិធីទៅតាមជម្រើសនេះផងដែរ។",
    addressPlaceholder: "ផ្លូវ, ទីក្រុង, ប្រទេស",
    saveProfile: "រក្សាទុកប្រវត្តិរូប",

    fieldCurrentPassword: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
    fieldNewPassword: "ពាក្យសម្ងាត់ថ្មី",
    fieldConfirmPassword: "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
    passwordHint: "យ៉ាងតិច {count} តួអក្សរ។",
    changePassword: "ប្ដូរពាក្យសម្ងាត់",
    changingPassword: "កំពុងប្ដូរ…",

    errors: {
      nameRequired: "ត្រូវការឈ្មោះពេញ។",
      nameTooLong: "ឈ្មោះពេញត្រូវមិនលើសពី ១២០ តួអក្សរ។",
      languageInvalid: "សូមជ្រើសរើសភាសាឲ្យបានត្រឹមត្រូវ។",
      addressTooLong: "អាសយដ្ឋានត្រូវមិនលើសពី ៥០០ តួអក្សរ។",
      avatarType: "សូមជ្រើសរើសរូបភាព JPEG, PNG ឬ WebP។",
      avatarTooLarge: "រូបភាពនោះធំពេក។",
      avatarUnreadable: "មិនអាចអានរូបភាពនោះបានទេ។",
      sessionExpired: "វគ្គរបស់អ្នកបានផុតកំណត់។ សូមចូលគណនីម្ដងទៀត។",
      currentPasswordRequired: "សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន។",
      currentPasswordWrong: "ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ។",
      newPasswordRequired: "សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី។",
      newPasswordTooShort: "សូមប្រើយ៉ាងតិច {count} តួអក្សរ។",
      newPasswordSame: "ពាក្យសម្ងាត់ថ្មីត្រូវខុសពីពាក្យសម្ងាត់បច្ចុប្បន្ន។",
      passwordMismatch: "ពាក្យសម្ងាត់មិនដូចគ្នាទេ។",
    },

    profileUpdated: "បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូប។",
    passwordChanged: "បានប្ដូរពាក្យសម្ងាត់។",
    passwordChangedSessions: {
      one: "បានប្ដូរពាក្យសម្ងាត់។ វគ្គផ្សេងទៀត {count} ត្រូវបានចាកចេញ។",
      other: "បានប្ដូរពាក្យសម្ងាត់។ វគ្គផ្សេងទៀត {count} ត្រូវបានចាកចេញ។",
    },
  },

  devices: {
    heading: "ឧបករណ៍",
    count: { one: "បានចូល {count}", other: "បានចូល {count}" },
    thisDevice: "ឧបករណ៍នេះ",
    unknownDevice: "ឧបករណ៍មិនស្គាល់",
    detail: "សកម្ម {lastSeen} · បានចូល {signedIn}",
    signOutDevice: "ចាកចេញ",
    signOutAll: "ចាកចេញពីឧបករណ៍ផ្សេងទាំងអស់",
    signingOut: "កំពុងចាកចេញ…",
    confirmAll: {
      one: "ចាកចេញពីឧបករណ៍ {count} មែនទេ?",
      other: "ចាកចេញពីឧបករណ៍ {count} មែនទេ?",
    },
    revoked: "ឧបករណ៍នោះបានចាកចេញហើយ។",
    revokedAll: {
      one: "ឧបករណ៍ផ្សេងទៀត {count} បានចាកចេញ។",
      other: "ឧបករណ៍ផ្សេងទៀត {count} បានចាកចេញ។",
    },
    note: "ឧបករណ៍គ្រប់យ៉ាងដែលបានចូលគណនីរបស់អ្នកបង្ហាញនៅទីនេះ។ បើអ្នកមិនស្គាល់ណាមួយ សូមឲ្យវាចាកចេញ ហើយប្ដូរពាក្យសម្ងាត់។",
    errors: {
      cannotRevokeCurrent: "សូមប្រើ ចាកចេញ ក្នុងម៉ឺនុយដើម្បីបញ្ចប់វគ្គនេះ។",
      revokeFailed: "ឧបករណ៍នោះបានចាកចេញរួចហើយ។",
      noOthers: "គ្មានឧបករណ៍ផ្សេងបានចូលទេ។",
    },
  },

  members: {
    heading: "សមាជិក",
    count: { one: "{count} នាក់", other: "{count} នាក់" },
    columnMember: "សមាជិក",
    columnAddress: "អាសយដ្ឋាន",
    columnLanguage: "ភាសា",
    columnJoined: "ចូលរួម",
    you: "អ្នក",
    note: "សមាជិកគឺជាគណនីចូលប្រើ ហើយម្នាក់ៗមានសៀវភៅកត់ត្រាដាច់ដោយឡែក — តួលេខមិនត្រូវបានចែករំលែករវាងគណនីទេ។ ការអញ្ជើញ និងការដកសមាជិកមិនទាន់មានទេ គណនីមកពីទិន្នន័យគំរូ។",
  },

  recovery: {
    title: "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    subtitle: "បញ្ជាក់លេខទូរស័ព្ទនៅលើគណនីរបស់អ្នក ហើយយើងនឹងផ្ញើលេខកូដទៅ។",
    fieldPhone: "លេខទូរស័ព្ទ",
    phoneHint: "មាន ឬគ្មានលេខកូដប្រទេសក៏បាន។ លេខកម្ពុជាចាត់ទុកជា +855។",
    sendCode: "ផ្ញើលេខកូដ",
    sending: "កំពុងផ្ញើ…",
    codeSent: "បើ {phone} មាននៅលើគណនីណាមួយ លេខកូដកំពុងផ្ញើទៅ។",
    devCode: "សម្រាប់ការអភិវឌ្ឍតែប៉ុណ្ណោះ — លេខកូដរបស់អ្នកគឺ {code}",
    fieldCode: "លេខកូដផ្ទៀងផ្ទាត់",
    verifyCode: "ផ្ទៀងផ្ទាត់",
    verifying: "កំពុងផ្ទៀងផ្ទាត់…",
    useAnotherNumber: "ប្រើលេខផ្សេង",
    chooseNewPassword: "សូមជ្រើសរើសពាក្យសម្ងាត់ថ្មី។",
    setPassword: "កំណត់ពាក្យសម្ងាត់ ហើយចូលគណនី",
    signsOutOthers: "ឧបករណ៍ផ្សេងទៀតទាំងអស់នឹងចាកចេញ។",
    smsBody: "{code} គឺជាលេខកូដកំណត់ពាក្យសម្ងាត់ឡើងវិញ។ វាផុតកំណត់ក្នុង ១០ នាទី។",

    qrHeading: "ឬចូលដោយស្កេន QR",
    qrDescription:
      "បើឧបករណ៍មួយផ្សេងទៀតនៅតែចូលគណនីនេះ អ្នកអាចស្កេនកូដជាមួយវាជំនួសវិញ — ពាក្យសម្ងាត់របស់អ្នកនៅដដែល។",
    qrAction: "បង្ហាញកូដ QR",
    backToLogin: "ត្រឡប់ទៅការចូលគណនី",

    errors: {
      phoneInvalid: "សូមបញ្ចូលលេខទូរស័ព្ទឲ្យបានត្រឹមត្រូវ។",
      codeRequired: "សូមបញ្ចូលលេខកូដ។",
      codeInvalid: "លេខកូដនោះមិនត្រឹមត្រូវទេ។",
      codeExpired: "លេខកូដនោះផុតកំណត់ហើយ។ សូមស្នើសុំថ្មី។",
      tooManyAttempts: "ព្យាយាមច្រើនដងពេក។ សូមស្នើសុំលេខកូដថ្មី។",
      rateLimited: "ស្នើសុំលេខកូដច្រើនដងពេក។ សូមព្យាយាមម្ដងទៀតក្នុងពេលបន្តិចទៀត។",
      startOver: "រយៈពេលយូរពេក។ សូមចាប់ផ្ដើមម្ដងទៀត។",
    },
  },

  qr: {
    title: "ចូលដោយស្កេនកូដ QR",
    subtitle:
      "សូមស្កេនកូដនេះដោយឧបករណ៍ដែលបានចូលគណនីរបស់អ្នករួចហើយ បន្ទាប់មកដាក់សំណើរនៅទីនោះ។",
    codeLabel: "កូដ QR សម្រាប់ដាក់សំណើរការចូលនេះ",
    waiting: "កំពុងរង់ចាំការដាក់សំណើរ · {seconds} វិនាទី",
    signedIn: "បានដាក់សំណើរ។ កំពុងចូលគណនី…",
    rejected: "សំណើនោះត្រូវបានបដិសេធ។",
    expired: "កូដនោះផុតកំណត់ហើយ។",
    newCode: "បង្ហាញកូដថ្មី",
    showCode: "បង្ហាញកូដ QR",
    preparing: "កំពុងរៀបចំ…",
    cannotScan: "ស្កេនមិនបាន?",
    usePhoneInstead: "ប្រើលេខទូរស័ព្ទជំនួសវិញ",
  },

  approve: {
    title: "ដាក់សំណើរការចូលគណនី?",
    subtitle: "កម្មវិធីរុករកមួយកំពុងស្នើសុំចូលគណនីរបស់អ្នក។",
    device: "ឧបករណ៍",
    ip: "អាសយដ្ឋាន IP",
    requested: "បានស្នើសុំ",
    account: "គណនី",
    warning:
      "សូមដាក់សំណើរតែក្នុងករណីអ្នកជាអ្នកចាប់ផ្ដើមវាដោយខ្លួនឯង។ ការដាក់សំណើរធ្វើឲ្យកម្មវិធីរុករកនោះចូលជាអ្នក។",
    approve: "ដាក់សំណើរ",
    reject: "បដិសេធ",
    approved: "បានដាក់សំណើរ។ ឧបករណ៍ផ្សេងកំពុងចូល។",
    rejected: "បានបដិសេធ។ គ្មានអ្វីបានចូលទេ។",
    errors: {
      expired: "សំណើនោះផុតកំណត់ហើយ។",
      alreadyDecided: "សំណើនោះត្រូវបានដោះស្រាយរួចហើយ។",
    },
  },

  phone: {
    heading: "ទូរស័ព្ទសង្គ្រោះ",
    description:
      "ប្រើសម្រាប់កំណត់ពាក្យសម្ងាត់ឡើងវិញ បើអ្នកចូលមិនបាន។ មានតែលេខដែលបានផ្ទៀងផ្ទាត់ទេដែលអាចធ្វើបាន។",
    field: "លេខទូរស័ព្ទ",
    hint: "មាន ឬគ្មានលេខកូដប្រទេសក៏បាន។ ទុកឲ្យទទេដើម្បីដកចេញ។",
    add: "បន្ថែមលេខ",
    update: "ធ្វើបច្ចុប្បន្នភាពលេខ",
    confirm: "បញ្ជាក់",
    isVerified: "បានផ្ទៀងផ្ទាត់",
    notVerified: "មិនទាន់ផ្ទៀងផ្ទាត់",
    verified: "បានផ្ទៀងផ្ទាត់លេខទូរស័ព្ទ។",
    removed: "បានដកលេខទូរស័ព្ទចេញ។",
    smsBody: "{code} គឺជាលេខកូដផ្ទៀងផ្ទាត់របស់អ្នក។ វាផុតកំណត់ក្នុង ១០ នាទី។",
    errors: {
      taken: "លេខនោះមាននៅលើគណនីផ្សេងរួចហើយ។",
    },
  },

  login: {
    title: "ចូលគណនី",
    subtitle: "សូមបញ្ចូលព័ត៌មានគណនីរបស់អ្នកដើម្បីបន្ត។",
    email: "អ៊ីមែល",
    password: "ពាក្យសម្ងាត់",
    submit: "ចូលគណនី",
    submitting: "កំពុងចូល…",
    missingFields: "សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់។",
    invalidCredentials: "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    forgotPassword: "ភ្លេចពាក្យសម្ងាត់?",
    useQr: "ចូលដោយស្កេនកូដ QR ជំនួសវិញ",
  },
};
